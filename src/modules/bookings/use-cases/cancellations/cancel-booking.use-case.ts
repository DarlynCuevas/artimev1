import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import { Inject, Injectable } from '@nestjs/common';
import { CancellationRepository } from '../../../../infrastructure/database/repositories/cancellation.repository';
import { BookingStatus } from '../../booking-status.enum';
import { CancellationInitiator } from '../../cancellations/cancellation-initiator.enum';
import { CancellationReason } from '../../cancellations/cancellation-reason.enum';
import { CancellationReviewStatus } from '../../cancellations/cancellation-review-status.enum';
import { CancellationRecord } from '../../cancellations/cancellation-record.entity';

@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly cancellationRepository: CancellationRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    initiator: CancellationInitiator;
    reason: CancellationReason;
    description?: string;
  }): Promise<{
    bookingStatus: BookingStatus;
    reviewRequired: boolean;
  }> {
    const booking = await this.bookingRepository.findById(
      input.bookingId,
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (
      booking.status !== BookingStatus.CONTRACT_SIGNED &&
      booking.status !== BookingStatus.PAID_PARTIAL
    ) {
      throw new Error('Booking cannot be cancelled in current state');
    }

    // Validate initiator + reason
    if (
      input.initiator === CancellationInitiator.ARTIST &&
      input.reason === CancellationReason.VENUE
    ) {
      throw new Error('Invalid cancellation reason for artist');
    }

    if (
      input.initiator !== CancellationInitiator.ARTIST &&
      (input.reason === CancellationReason.ARTIST_JUSTIFIED ||
        input.reason === CancellationReason.ARTIST_UNJUSTIFIED)
    ) {
      throw new Error('Invalid cancellation reason for initiator');
    }

    const requiresReview =
      input.initiator === CancellationInitiator.ARTIST &&
      input.reason === CancellationReason.ARTIST_JUSTIFIED;

    const resultingStatus = requiresReview
      ? BookingStatus.CANCELLED_PENDING_REVIEW
      : BookingStatus.CANCELLED;

    const record = new CancellationRecord({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      initiator: input.initiator,
      reason: input.reason,
      description: input.description,
      previousStatus: booking.status,
      resultingStatus,
      reviewStatus: requiresReview
        ? CancellationReviewStatus.PENDING
        : CancellationReviewStatus.NOT_REQUIRED,
      createdAt: new Date(),
    });

    await this.cancellationRepository.save(record);

    booking.changeStatus(resultingStatus);
    await this.bookingRepository.update(booking);

    return {
      bookingStatus: resultingStatus,
      reviewRequired: requiresReview,
    };
  }
}
