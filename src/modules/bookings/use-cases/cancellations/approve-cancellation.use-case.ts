import { BookingRepository } from '../../../../infrastructure/database/repositories/booking.repository';
import { CancellationRepository } from '../../../../infrastructure/database/repositories/cancellation.repository';
import { BookingStatus } from '../../booking-status.enum';
import { CancellationReviewStatus } from '../../cancellations/cancellation-review-status.enum';

export class ApproveCancellationUseCase {
  constructor(
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
