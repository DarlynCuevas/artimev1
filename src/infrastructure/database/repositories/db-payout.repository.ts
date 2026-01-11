import { Injectable } from '@nestjs/common';
import type { PayoutRepository } from './payout.repository';
import type { PayoutRecord } from '../../../modules/payments/use-cases/payouts/entities/payout-record.entity';

@Injectable()
export class DbPayoutRepository implements PayoutRepository {
  async findByBookingId(
    bookingId: string,
  ): Promise<PayoutRecord | null> {
    // TODO: Implement DB lookup (Supabase / Prisma / etc)
    return null;
  }

  async save(record: PayoutRecord): Promise<void> {
    // TODO: Persist payout record in DB
    return;
  }
}
