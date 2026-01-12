import { Payout } from '../entities/payout.entity';

export interface PayoutRepository {
  findByBookingId(bookingId: string): Promise<Payout | null>;
  save(payout: Payout): Promise<void>;
}
