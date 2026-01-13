// booking.repository.ts

import { supabase } from '../supabase.client';
import { Booking } from '../../../modules/bookings/booking.entity';
import { BookingStatus } from '../../../modules/bookings/booking-status.enum';

export class SupabaseBookingRepository  {
  async findById(id: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return new Booking({
      id: data.id,
      artistId: data.artist_id,
      venueId: data.venue_id,
      promoterId: data.promoter_id,
      status: data.status as BookingStatus,
      createdAt: new Date(data.created_at),
      artistStripeAccountId: data.artist_stripe_account_id,
      managerStripeAccountId: data.manager_stripe_account_id,
      currency: data.currency,
      start_date: data.start_date,
      artimeCommissionPercentage: data.artime_commission_percentage,
      managerId: data.manager_id,
      managerCommissionPercentage: data.manager_commission_percentage,
      totalAmount: data.total_amount
    });
  }

  async save(booking: Booking): Promise<void> {
    const persistence = {
      id: booking.id,
      artist_id: booking.artistId,
      venue_id: booking.venueId,
      promoter_id: booking.promoterId,
      event_id: booking.eventId,
      start_date: booking.start_date,
      status: booking.status,

      currency: booking.currency,
      total_amount: booking.totalAmount,
 
      artist_stripe_account_id: booking.artistStripeAccountId,
      manager_stripe_account_id: booking.managerStripeAccountId,
      artime_commission_percentage: booking.artimeCommissionPercentage,

      created_at: booking.createdAt,
    };

    const { error } = await supabase
      .from('bookings')
      .insert(persistence);

    if (error) {
      throw new Error(`Error saving booking: ${error.message}`);
    }
  }

  async update(booking: Booking): Promise<void> {
    await supabase
      .from('bookings')
      .update({
        status: booking.status,
        updated_at: new Date(),
      })
      .eq('id', booking.id);
  }
}
