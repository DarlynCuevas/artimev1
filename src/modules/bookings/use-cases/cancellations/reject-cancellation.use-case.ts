import { SupabaseBookingRepository } from '../../../../infrastructure/database/repositories/bookings/SupabaseBookingRepository';
import { CancellationRepository } from '../../../../infrastructure/database/repositories/cancellation.repository';
import { BookingStatus } from '../../booking-status.enum';
import { CancellationReviewStatus } from '../../cancellations/enums/cancellation-review-status.enum';

export class RejectCancellationUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly cancellationRepository: CancellationRepository,
  ) {}

  async execute(input: {
    bookingId: string;
  }): Promise<{ bookingStatus: BookingStatus }> {
    const booking = await this.supabaseBookingRepository.findById(input.bookingId);

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
      CancellationReviewStatus.REJECTED,
    );

    booking.changeStatus(BookingStatus.CANCELLED);
    await this.supabaseBookingRepository.update(booking);

    return { bookingStatus: BookingStatus.CANCELLED };
  }
}
