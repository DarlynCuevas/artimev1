import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { PayoutRepository } from '../../modules/payments/repositories/payout.repository';
import { Payout, PayoutStatus } from '../../modules/payments/entities/payout.entity';

@Injectable()
export class DbPayoutRepository implements PayoutRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByBookingId(bookingId: string): Promise<Payout | null> {
    const { data, error } = await this.supabase
      .from('payouts')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToEntity(data);
  }

  async save(payout: Payout): Promise<void> {
    const { error } = await this.supabase.from('payouts').insert({
      id: payout.id,
      booking_id: payout.bookingId,
      artist_id: payout.artistId,
      manager_id: payout.managerId,

      gross_amount: payout.grossAmount,
      artime_fee_amount: payout.artimeFeeAmount,
      manager_fee_amount: payout.managerFeeAmount,
      artist_net_amount: payout.artistNetAmount,

      currency: payout.currency,
      status: payout.status,
      stripe_transfer_id: payout.stripeTransferId ?? null,
    });

    if (error) {
      throw new Error(`Error saving payout: ${error.message}`);
    }
  }

  private mapToEntity(row: any): Payout {
    return new Payout(
      row.id,
      row.booking_id,
      row.artist_id,
      row.manager_id,

      row.gross_amount,
      row.artime_fee_amount,
      row.manager_fee_amount,
      row.artist_net_amount,

      row.currency,
      row.status as PayoutStatus,

      row.stripe_transfer_id,
      new Date(row.created_at),
      row.paid_at ? new Date(row.paid_at) : null,
    );
  }
}
