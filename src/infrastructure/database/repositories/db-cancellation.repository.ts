import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { SUPABASE_CLIENT } from '../supabase.module';
import { Injectable } from '@nestjs/common';
import { CancellationRepository } from '../../../modules/payments/cancellations/cancellation.repository';
import { CancellationRecord } from '../../../modules/payments/cancellations/cancellation-record.entity';
import { CancellationStatus } from '../../../modules/payments/cancellations/cancellation-status.enum';

@Injectable()
export class DbCancellationRepository implements CancellationRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) { }

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
      data.initiator,
      data.reason,
      data.status as CancellationStatus,
      new Date(data.created_at),
      data.resolved_at ? new Date(data.resolved_at) : null,
    );
  }

  async save(record: CancellationRecord): Promise<void> {
    const payload = {
      id: record.id,
      booking_id: record.bookingId,
      initiator: record.initiator,
      initiated_by: record.initiator,
      reason: record.reason,
      description: record.description ?? null,
      previous_status: record.previousStatus,
      resulting_status: record.resultingStatus,
      review_status: record.reviewStatus,
      status: record.resultingStatus,
      created_at: record.createdAt,
    };

    const { error } = await this.supabase
      .from('cancellation_records')
      .insert(payload);

    if (error) {
      throw new Error(`Error saving cancellation record: ${error.message}`);
    }
  }
}
