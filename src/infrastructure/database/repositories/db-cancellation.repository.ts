import { SupabaseClient } from '@supabase/supabase-js';
import { Injectable } from '@nestjs/common';
import { CancellationRepository } from '../../../modules/payments/cancellations/cancellation.repository';
import { CancellationRecord } from '../../../modules/payments/cancellations/cancellation-record.entity';
import { CancellationStatus } from '../../../modules/payments/cancellations/cancellation-status.enum';

@Injectable()
export class DbCancellationRepository implements CancellationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByBookingId(
    bookingId: string,
  ): Promise<CancellationRecord | null> {
    const { data } = await this.supabase
      .from('cancellation_records')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (!data) return null;

    return new CancellationRecord(
      data.id,
      data.booking_id,
      data.initiated_by,
      data.reason,
      data.status as CancellationStatus,
      new Date(data.created_at),
      data.resolved_at ? new Date(data.resolved_at) : null,
    );
  }

  async save(record: CancellationRecord): Promise<void> {
    await this.supabase.from('cancellation_records').insert({
      id: record.id,
      booking_id: record.bookingId,
      initiated_by: record.initiatedBy,
      reason: record.reason,
      status: record.status,
    });
  }
}
