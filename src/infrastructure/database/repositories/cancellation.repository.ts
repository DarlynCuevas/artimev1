import { CancellationRecord } from '../../../modules/bookings/cancellations/cancellation-record.entity';
import { CancellationReviewStatus } from '../../../modules/bookings/cancellations/cancellation-review-status.enum';

export interface CancellationRepository {
  save(record: CancellationRecord): Promise<void>;

  updateReviewStatus(
    recordId: string,
    reviewStatus: CancellationReviewStatus,
  ): Promise<void>;

  findByBookingId(
    bookingId: string,
  ): Promise<CancellationRecord[]>;
}
