
// booking.repository.ts

import { supabase } from '../../supabase.client';
import { Booking } from '../../../../modules/bookings/booking.entity';
import { BookingStatus } from '../../../../modules/bookings/booking-status.enum';

export class SupabaseBookingRepository {

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
      totalAmount: data.total_amount,


      handledByRole: data.handled_by_role ?? null,
      handledByUserId: data.handled_by_user_id ?? null,
      handledAt: data.handled_at ? new Date(data.handled_at) : null,
    });

  }

  async save(booking: Booking): Promise<void> {
    console.log('booking save ', booking);
    
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


      handled_by_role: booking.handledByRole,
      handled_by_user_id: booking.handledByUserId,
      handled_at: booking.handledAt,

      created_at: booking.createdAt,
    };


    const { error } = await supabase
      .from('bookings')
      .upsert(persistence, { onConflict: 'id' });

    if (error) {
      throw new Error(`Error saving booking: ${error.message}`);
    }
  }

  async update(booking: Booking): Promise<void> {
    await supabase
      .from('bookings')
      .update({
        status: booking.status,

        handled_by_role: booking.handledByRole,
        handled_by_user_id: booking.handledByUserId,
        handled_at: booking.handledAt,

        updated_at: new Date(),
      })
      .eq('id', booking.id);
  }

  async findByArtistId(artistId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('artist_id', artistId);

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => new Booking({
      id: row.id,
      artistId: row.artist_id,
      venueId: row.venue_id,
      promoterId: row.promoter_id,
      status: row.status as BookingStatus,
      createdAt: new Date(row.created_at),
      artistStripeAccountId: row.artist_stripe_account_id,
      managerStripeAccountId: row.manager_stripe_account_id,
      currency: row.currency,
      start_date: row.start_date,
      artimeCommissionPercentage: row.artime_commission_percentage,
      managerId: row.manager_id,
      managerCommissionPercentage: row.manager_commission_percentage,
      totalAmount: row.total_amount,
      handledByRole: row.handled_by_role ?? null,
      handledByUserId: row.handled_by_user_id ?? null,
      handledAt: row.handled_at ? new Date(row.handled_at) : null, // <-- agrega esto
      // ...otros campos necesarios
    }));
  }

  async findByVenueId(venueId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(
    (row) =>
      new Booking({
        id: row.id,
        artistId: row.artist_id,
        venueId: row.venue_id,
        promoterId: row.promoter_id,
        eventId: row.event_id,
        status: row.status,
        createdAt: new Date(row.created_at),
        currency: row.currency,
        totalAmount: row.total_amount,
        start_date: row.start_date,

        artistStripeAccountId: row.artist_stripe_account_id,
        managerStripeAccountId: row.manager_stripe_account_id,
        artimeCommissionPercentage: row.artime_commission_percentage,
        managerCommissionPercentage: row.manager_commission_percentage,
        managerId: row.manager_id,

        handledByRole: row.handled_by_role ?? null,
        handledByUserId: row.handled_by_user_id ?? null,
        handledAt: row.handled_at ? new Date(row.handled_at) : null,
      }),
  );
}

}
