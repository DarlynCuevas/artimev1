import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CancellationCase } from '../../../../../modules/bookings/cancellations/entities/cancellation-case.entity';
import { CancellationCaseRepository } from '../../../../../modules/bookings/cancellations/repositories/cancellation-case.repository.interface';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { SUPABASE_CLIENT } from '../../../../database/supabase.module';


@Injectable()
export class DbCancellationCaseRepository implements CancellationCaseRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) { }

  async findByBookingId(bookingId: string): Promise<CancellationCase | null> {
    const { data, error } = await this.supabase
      .from('cancellation_cases')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error || !data) return null;
    return data as CancellationCase;
  }

  async save(cancellationCase: CancellationCase): Promise<void> {
    const payload = {
      id: cancellationCase.id,
      booking_id: cancellationCase.bookingId,
      requested_by_user_id: cancellationCase.requestedByUserId,
      created_at: cancellationCase.createdAt,
      resolved_at: cancellationCase.resolvedAt ?? null,
      description: cancellationCase.description ?? null,
      booking_status_at_cancellation: cancellationCase.bookingStatusAtCancellation,
      payment_status_at_cancellation: cancellationCase.paymentStatusAtCancellation,
      status: cancellationCase.status,
      requested_by_role: cancellationCase.requestedByRole,
      reason: cancellationCase.reason,
    };

    const { error } = await this.supabase
      .from('cancellation_cases')
      .insert(payload);

    if (error) {
      throw new Error('Failed to persist CancellationCase');
    }
  }

  async update(cancellationCase: CancellationCase): Promise<void> {
    const { error } = await this.supabase
      .from('cancellation_cases')
      .update({
        status: cancellationCase.status,
        resolved_at: cancellationCase.resolvedAt ?? null,
      })
      .eq('id', cancellationCase.id);

    if (error) {
      throw new Error('Failed to update CancellationCase');
    }
  }

  async findById(id: string): Promise<CancellationCase | null> {
    const { data, error } = await this.supabase
      .from('cancellation_cases')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'Error fetching cancellation case by id',
      );
    }

    return data ? (data as CancellationCase) : null;
  }

  async markResolved(id: string): Promise<void> {
  const { error } = await this.supabase
    .from('cancellation_cases')
    .update({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw error;
  }
}


}
