
import { Injectable, Inject } from '@nestjs/common';
import { PaymentMilestoneStatus } from '../../payment-milestone-status.enum';
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

interface CreatePaymentIntentForMilestoneInput {
  paymentMilestoneId: string;
}

interface CreatePaymentIntentForMilestoneOutput {
  clientSecret: string;
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
  ) {}

  async execute(
    input: CreatePaymentIntentForMilestoneInput,
  ): Promise<CreatePaymentIntentForMilestoneOutput> {
    // 1️ Load milestone
    const milestone = await this.milestoneRepository.findById(input.paymentMilestoneId);

    if (!milestone) {
      throw new Error('Payment milestone not found');
    }

    if (!milestone.canBePaid()) {
      throw new Error('Payment milestone cannot be paid');
    }

    // 3️ Load booking
    const booking = await this.bookingRepository.findById(
      milestone.bookingId,
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    const idempotencyKey = `milestone-${milestone.id}`;

    // 2️ Idempotency: reuse existing PaymentIntent record
    const existingIntent =
      await this.paymentIntentRepository.findByIdempotencyKey(
        idempotencyKey,
      );

    if (existingIntent?.clientSecret) {
      return {
        clientSecret: existingIntent.clientSecret,
      };
    }

    if (existingIntent?.providerPaymentId) {
      const intent =
        await this.paymentProvider.retrievePaymentIntent(
          existingIntent.providerPaymentId,
        );
      const clientSecret = intent.client_secret ?? null;

      await this.paymentIntentRepository.updateByIdempotencyKey(
        idempotencyKey,
        {
          providerPaymentId: intent.id,
          clientSecret,
          status: intent.status,
        },
      );

      if (!clientSecret) {
        throw new Error('PaymentIntent has no client_secret');
      }

      return { clientSecret };
    }

    if (milestone.providerPaymentId) {
      const intent =
        await this.paymentProvider.retrievePaymentIntent(
          milestone.providerPaymentId,
        );
      const clientSecret = intent.client_secret ?? null;

      await this.paymentIntentRepository.save({
        provider: 'stripe',
        bookingId: milestone.bookingId,
        milestoneId: milestone.id,
        amount: milestone.amount,
        currency: booking.currency,
        status: intent.status,
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

      return { clientSecret };
    }

    // 4️ Load artist
    const artist = await this.artistRepository.findById(
      booking.artistId,
    );

    if (!artist) {
      throw new Error('Artist not found');
    }

    if (
      artist.stripeOnboardingStatus !==
      StripeOnboardingStatus.COMPLETED
    ) {
      throw new Error('Artist cannot receive payments');
    }

    // 5️ Determine payer (venue or promoter)
    const payerId =
      booking.promoterId ?? booking.venueId;

    if (!payerId) {
      throw new Error('No payer defined for booking');
    }

    if (booking.status !== 'CONTRACT_SIGNED') {
      throw new Error('Contract is not signed');
    }

      
    const intent =
      await this.paymentProvider.createPaymentIntent({
        amount: milestone.amount,
        currency: booking.currency,
        metadata: {
          payerId,
          bookingId: booking.id,
          milestoneId: milestone.id,
        },
        idempotencyKey,
      });

    // 7️ Persist providerPaymentId in milestone
    milestone.markProviderPaymentIdCreated(
      intent.providerPaymentId,
    );

    await this.milestoneRepository.update(milestone);

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

    // 8️ Return client secret to frontend
    return {
      clientSecret: intent.clientSecret,
    };
  }
}

