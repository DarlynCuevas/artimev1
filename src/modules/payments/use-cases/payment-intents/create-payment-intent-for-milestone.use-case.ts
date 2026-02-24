import { Injectable, Inject } from '@nestjs/common';
import type { PaymentMilestoneRepository } from '../../payment-milestone.repository.interface';
import type { BookingRepository } from '../../../bookings/repositories/booking.repository.interface';
import type { ArtistRepository } from '../../../artists/repositories/artist.repository.interface';
import type { PaymentProvider } from '../../providers/payment-provider.interface';
import type { PaymentIntentRepository } from '../../repositories/payment-intent.repository.interface';
import { PAYMENT_MILESTONE_REPOSITORY } from '../../payment-milestone-repository.token';
import { BOOKING_REPOSITORY } from '../../../bookings/repositories/booking-repository.token';
import { ARTIST_REPOSITORY } from '../../../artists/repositories/artist-repository.token';
import { PAYMENT_PROVIDER } from '../../providers/payment-provider.token';
import { PAYMENT_INTENT_REPOSITORY } from '../../repositories/payment-intent.repository.token';
import { StripeOnboardingStatus } from '../../stripe/stripe-onboarding-status.enum';
import { StripeConnectService } from '@/src/infrastructure/payments/stripe-connect.service';

interface CreatePaymentIntentForMilestoneInput {
  paymentMilestoneId: string;
}

interface CreatePaymentIntentForMilestoneOutput {
  clientSecret: string;
  status?: string;
}

@Injectable()
export class CreatePaymentIntentForMilestoneUseCase {
  constructor(
    @Inject(PAYMENT_MILESTONE_REPOSITORY)
    private readonly milestoneRepository: PaymentMilestoneRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
    @Inject(PAYMENT_INTENT_REPOSITORY)
    private readonly paymentIntentRepository: PaymentIntentRepository,
    private readonly stripeConnectService: StripeConnectService,
  ) {}

  async execute(
    input: CreatePaymentIntentForMilestoneInput,
  ): Promise<CreatePaymentIntentForMilestoneOutput> {
    const milestone = await this.milestoneRepository.findById(
      input.paymentMilestoneId,
    );

    if (!milestone) {
      throw new Error('Payment milestone not found');
    }

    if (!milestone.canBePaid()) {
      throw new Error('Payment milestone cannot be paid');
    }

    const booking = await this.bookingRepository.findById(
      milestone.bookingId,
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    const idempotencyKey = `milestone-${milestone.id}`;

    const isTerminalStatus = (status?: string | null) =>
      status === 'succeeded' || status === 'canceled';

    const ensurePayerId = async () => {
      const artist = await this.artistRepository.findById(
        booking.artistId,
      );

      if (!artist) {
        throw new Error('Artist not found');
      }

      if (artist.stripeOnboardingStatus !== StripeOnboardingStatus.COMPLETED) {
        if (!artist.stripeAccountId) {
          throw new Error('Artist cannot receive payments');
        }

        const stripeAccount = await this.stripeConnectService.getAccount(
          artist.stripeAccountId,
        );
        const realOnboardingStatus =
          this.stripeConnectService.resolveOnboardingStatus(stripeAccount);

        if (realOnboardingStatus !== artist.stripeOnboardingStatus) {
          artist.setStripeAccount({
            stripeAccountId: artist.stripeAccountId,
            onboardingStatus: realOnboardingStatus,
          });
          await this.artistRepository.update(artist);
        }

        if (realOnboardingStatus !== StripeOnboardingStatus.COMPLETED) {
          throw new Error('Artist cannot receive payments');
        }
      }

      const payerId =
        booking.promoterId ?? booking.venueId;

      if (!payerId) {
        throw new Error('No payer defined for booking');
      }

      if (booking.status !== 'CONTRACT_SIGNED') {
        throw new Error('Contract is not signed');
      }

      return payerId;
    };

    const existingIntent =
      await this.paymentIntentRepository.findByIdempotencyKey(
        idempotencyKey,
      );

    const createNewIntent = async (
      payerId: string,
      overrideIdempotencyKey?: string,
    ) => {
      const intent =
        await this.paymentProvider.createPaymentIntent({
          amount: milestone.amount,
          currency: booking.currency,
          metadata: {
            payerId,
            bookingId: booking.id,
            milestoneId: milestone.id,
          },
          idempotencyKey: overrideIdempotencyKey ?? idempotencyKey,
        });

      milestone.markProviderPaymentIdCreated(
        intent.providerPaymentId,
      );
      await this.milestoneRepository.update(milestone);

      if (existingIntent) {
        await this.paymentIntentRepository.updateByIdempotencyKey(
          idempotencyKey,
          {
            providerPaymentId: intent.providerPaymentId,
            clientSecret: intent.clientSecret,
            status: intent.status,
          },
        );
      } else {
        await this.paymentIntentRepository.save({
          provider: 'stripe',
          bookingId: booking.id,
          milestoneId: milestone.id,
          amount: milestone.amount,
          currency: booking.currency,
          status: intent.status,
          providerPaymentId: intent.providerPaymentId,
          clientSecret: intent.clientSecret,
          idempotencyKey,
          metadata: {
            payerId,
            bookingId: booking.id,
            milestoneId: milestone.id,
          },
        });
      }

      return {
        clientSecret: intent.clientSecret,
        status: intent.status,
      };
    };

    if (existingIntent?.clientSecret && !existingIntent?.providerPaymentId) {
      return {
        clientSecret: existingIntent.clientSecret,
        status: existingIntent.status,
      };
    }

    if (existingIntent?.providerPaymentId) {
      const intent =
        await this.paymentProvider.retrievePaymentIntent(
          existingIntent.providerPaymentId,
        );
      const clientSecret = intent.client_secret ?? null;
      const status = (intent.status as string | undefined) ?? 'unknown';

      await this.paymentIntentRepository.updateByIdempotencyKey(
        idempotencyKey,
        {
          providerPaymentId: intent.id,
          clientSecret,
          status,
        },
      );

      if (!clientSecret) {
        throw new Error('PaymentIntent has no client_secret');
      }

      if (isTerminalStatus(status)) {
        if (status === 'succeeded') {
          return { clientSecret, status };
        }

        const payerId = await ensurePayerId();
        const retryKey = `${idempotencyKey}-retry-${Date.now()}`;
        return createNewIntent(payerId, retryKey);
      }

      return { clientSecret, status };
    }

    if (milestone.providerPaymentId) {
      const intent =
        await this.paymentProvider.retrievePaymentIntent(
          milestone.providerPaymentId,
        );
      const clientSecret = intent.client_secret ?? null;
      const status = (intent.status as string | undefined) ?? 'unknown';

      await this.paymentIntentRepository.save({
        provider: 'stripe',
        bookingId: milestone.bookingId,
        milestoneId: milestone.id,
        amount: milestone.amount,
        currency: booking.currency,
        status,
        providerPaymentId: intent.id,
        clientSecret,
        idempotencyKey,
        metadata: {
          bookingId: milestone.bookingId,
          milestoneId: milestone.id,
        },
      });

      if (!clientSecret) {
        throw new Error('PaymentIntent has no client_secret');
      }

      if (isTerminalStatus(status)) {
        if (status === 'succeeded') {
          return { clientSecret, status };
        }

        const payerId = await ensurePayerId();
        const retryKey = `${idempotencyKey}-retry-${Date.now()}`;
        return createNewIntent(payerId, retryKey);
      }

      return { clientSecret, status };
    }

    const payerId = await ensurePayerId();
    return createNewIntent(payerId);
  }
}
