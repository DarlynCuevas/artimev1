import { CancellationRecord } from "../cancellation-record.entity";


export interface CancellationRepository {
  save(cancellation: CancellationRecord): Promise<void>;
  findByBookingId(
    bookingId: string,
  ): Promise<CancellationRecord | null>;
}
