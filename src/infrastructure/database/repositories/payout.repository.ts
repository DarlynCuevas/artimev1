import { PayoutRecord } from "src/modules/payments/use-cases/payouts/entities/payout-record.entity";


export interface PayoutRepository {
  findByBookingId(bookingId: string): Promise<PayoutRecord | null>;
  save(record: PayoutRecord): Promise<void>;
}
