import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase.client';
import { SplitSummary } from '../../../modules/payments/split/split-summary.entity';
import { SplitSummaryRepository } from './split-summary.repository.interface';

@Injectable()
export class DbSplitSummaryRepository implements SplitSummaryRepository {
  async save(split: SplitSummary): Promise<void> {
    await supabase.from('split_summaries').upsert({
      booking_id: split.bookingId,
      artist_fee: split.artistFee,
      artime_commission: split.artimeCommission,
      manager_involved: split.managerInvolved,
      manager_commission: split.managerCommission,
      payment_costs: split.paymentCosts,
      artist_net_amount: split.artistNetAmount,
      total_payable: split.totalPayable,
      currency: split.currency,
      frozen_at: split.frozenAt,
    }, { onConflict: 'booking_id' });
  }

  async findByBookingId(bookingId: string): Promise<SplitSummary | null> {
    const { data, error } = await supabase
      .from('split_summaries')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error || !data) return null;

    return new SplitSummary({
      bookingId: data.booking_id,
      artistFee: data.artist_fee,
      artimeCommission: data.artime_commission,
      managerInvolved: data.manager_involved,
      managerCommission: data.manager_commission,
      paymentCosts: data.payment_costs,
      artistNetAmount: data.artist_net_amount,
      totalPayable: data.total_payable,
      currency: data.currency,
      frozenAt: new Date(data.frozen_at),
    });
  }
}
