import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import { Inject, Injectable } from '@nestjs/common';
import type { CancellationRepository } from '@/src/infrastructure/database/repositories/cancellation.repository';
import { BookingStatus } from '../../booking-status.enum';
import { CancellationReviewStatus } from '../../cancellations/enums/cancellation-review-status.enum';

@Injectable()
export class ApproveCancellationUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly cancellationRepository: CancellationRepository,
  ) {}

  async execute(input: {
    bookingId: string;
  }): Promise<{ bookingStatus: BookingStatus }> {
    const booking = await this.bookingRepository.findById(input.bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.CANCELLED_PENDING_REVIEW) {
      throw new Error('Booking is not pending review');
    }

    const records =
      await this.cancellationRepository.findByBookingId(booking.id);

    const pendingRecord = records.find(
      (r) => r.reviewStatus === CancellationReviewStatus.PENDING,
    );

    if (!pendingRecord) {
      throw new Error('No pending cancellation review found');
    }

    await this.cancellationRepository.updateReviewStatus(
      pendingRecord.id,
      CancellationReviewStatus.APPROVED,
    );

    booking.changeStatus(BookingStatus.CANCELLED);
    await this.bookingRepository.update(booking);

    return { bookingStatus: BookingStatus.CANCELLED };
  }
}
