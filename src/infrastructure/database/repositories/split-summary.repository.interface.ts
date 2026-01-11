import { SplitSummary } from '../../../modules/payments/split/split-summary.entity';

export interface SplitSummaryRepository {
  save(split: SplitSummary): Promise<void>;
  findByBookingId(bookingId: string): Promise<SplitSummary | null>;
}
