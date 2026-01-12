
import { Injectable, Inject } from '@nestjs/common';
import { PaymentMilestoneStatus } from '../../payment-milestone-status.enum';
import type { PaymentMilestoneRepository } from '../../payment-milestone.repository.interface';
import type { BookingRepository } from '../../../bookings/repositories/booking.repository.interface';
import type { ArtistRepository } from '../../../artists/repositories/artist.repository.interface';
import type { PaymentProvider } from '../../providers/payment-provider.interface';
import { PAYMENT_MILESTONE_REPOSITORY } from '../../payment-milestone-repository.token';
import { BOOKING_REPOSITORY } from '../../../bookings/repositories/booking-repository.token';
import { ARTIST_REPOSITORY } from '../../../artists/repositories/artist-repository.token';
import { PAYMENT_PROVIDER } from '../../providers/payment-provider.token';
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
  ) {}

  async execute(
    input: CreatePaymentIntentForMilestoneInput,
  ): Promise<CreatePaymentIntentForMilestoneOutput> {
    // 1️ Load milestone
    const milestone =
      await this.milestoneRepository.findById(
        input.paymentMilestoneId,
      );

    if (!milestone) {
      throw new Error('Payment milestone not found');
    }

    if (!milestone.canBePaid()) {
      throw new Error('Payment milestone cannot be paid');
    }

    if (milestone.providerPaymentId) {
      throw new Error('Payment intent already exists for milestone');
    }

    // 2️⃣ Load booking
    const booking = await this.bookingRepository.findById(
      milestone.bookingId,
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'CONTRACT_SIGNED') {
      throw new Error('Contract is not signed');
    }

    // 3️⃣ Load artist
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

    // 4️⃣ Determine payer (venue or promoter)
    const payerId =
      booking.promoterId ?? booking.venueId;

    if (!payerId) {
      throw new Error('No payer defined for booking');
    }

    // 5️⃣ Create PaymentIntent via provider
    const paymentIntent =
      await this.paymentProvider.createPaymentIntent({
        amount: milestone.amount,
        currency: booking.currency,
        metadata: {
          payerId,
          bookingId: booking.id,
          milestoneId: milestone.id,
        },
      });

    // 6️⃣ Persist reference in milestone
    milestone.markProviderPaymentIdCreated(
      paymentIntent.providerPaymentId,
    );

    await this.milestoneRepository.update(milestone);

    // 7️⃣ Return client secret to frontend
    return {
      clientSecret: paymentIntent.clientSecret,
    };
  }
}
