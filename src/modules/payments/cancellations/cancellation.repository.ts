import { CancellationRecord } from './cancellation-record.entity';

export interface CancellationRepository {
  save(record: CancellationRecord): Promise<void>;
  findByBookingId(bookingId: string): Promise<CancellationRecord | null>;
}
