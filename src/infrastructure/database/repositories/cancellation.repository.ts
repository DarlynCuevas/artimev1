// cancellation.repository.ts

import { supabase } from '../supabase.client';
import { CancellationRecord } from '../../../modules/bookings/cancellations/cancellation-record.entity';
import { CancellationInitiator } from '../../../modules/bookings/cancellations/cancellation-initiator.enum';
import { CancellationReason } from '../../../modules/bookings/cancellations/cancellation-reason.enum';
import { CancellationReviewStatus } from '../../../modules/bookings/cancellations/cancellation-review-status.enum';
import { BookingStatus } from '../../../modules/bookings/booking-status.enum';

export class CancellationRepository {
    async updateReviewStatus(
      recordId: string,
      reviewStatus: CancellationReviewStatus,
    ): Promise<void> {
      await supabase
        .from('cancellation_records')
        .update({ review_status: reviewStatus })
        .eq('id', recordId);
    }
  async save(record: CancellationRecord): Promise<void> {
    await supabase.from('cancellation_records').insert({
      id: record.id,
      booking_id: record.bookingId,
      initiator: record.initiator,
      reason: record.reason,
      description: record.description ?? null,
      previous_status: record.previousStatus,
      resulting_status: record.resultingStatus,
      review_status: record.reviewStatus,
      created_at: record.createdAt,
    });
  }

  async findByBookingId(
    bookingId: string,
  ): Promise<CancellationRecord[]> {
    const { data, error } = await supabase
      .from('cancellation_records')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(
      (row) =>
        new CancellationRecord({
          id: row.id,
          bookingId: row.booking_id,
          initiator: row.initiator as CancellationInitiator,
          reason: row.reason as CancellationReason,
          description: row.description ?? undefined,
          previousStatus: row.previous_status as BookingStatus,
          resultingStatus: row.resulting_status as BookingStatus,
          reviewStatus:
            row.review_status as CancellationReviewStatus,
          createdAt: new Date(row.created_at),
        }),
    );
  }
}
