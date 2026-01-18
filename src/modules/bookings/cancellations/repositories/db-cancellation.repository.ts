import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/infrastructure/database/supabase.module';
import { CancellationRecord } from '../entities/cancellation-record.entity';
import { CancellationRepository } from './cancellation.repository.interface';


@Injectable()
export class DbCancellationRepository implements CancellationRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async save(cancellation: CancellationRecord): Promise<void> {
    const { error } = await this.supabase
      .from('cancellation_records')
      .insert({
        id: cancellation.id,
        booking_id: cancellation.bookingId,
        initiator: cancellation.initiatedBy,
        reason: cancellation.reason,
        description: cancellation.description ?? null,
        previous_status: cancellation.previousStatus,
        resulting_status: cancellation.resultingStatus,
        review_status: cancellation.reviewStatus,
        created_at: cancellation.createdAt,
      });
    if (error) {
      console.error('Error saving cancellation record:', error);
      throw new Error(
        `Error saving cancellation record: ${error.message}`,
      );
    } else {
      console.log('Cancellation record saved:', cancellation);
    }
  }

  async findByBookingId(
    bookingId: string,
  ): Promise<CancellationRecord | null> {
    const { data } = await this.supabase
      .from('cancellation_records')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (!data) return null;

    return new CancellationRecord({
      id: data.id,
      bookingId: data.booking_id,
      initiator: data.initiator,
      initiated_by: data.initiated_by,
      reason: data.reason,
      description: data.description,
      previousStatus: data.previous_status,
      resultingStatus: data.resulting_status,
      reviewStatus: data.review_status,
      createdAt: new Date(data.created_at),
    });
  }
}
