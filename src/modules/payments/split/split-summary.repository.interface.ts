import type { SplitSummary } from './split-summary.entity';

export interface SplitSummaryRepository {
  save(split: SplitSummary): Promise<void>;
  findByBookingId(bookingId: string): Promise<SplitSummary | null>;
}
