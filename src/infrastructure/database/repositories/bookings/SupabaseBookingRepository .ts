
// booking.repository.ts

import { supabase } from '../../supabase.client';
import { Booking } from '../../../../modules/bookings/booking.entity';
import { BookingStatus } from '../../../../modules/bookings/booking-status.enum';
import { Artist } from '@/src/modules/artists/entities/artist.entity';

export class SupabaseBookingRepository {

  async findById(id: string): Promise<Booking | null> {
    console.log('ide busqueda booking ', id);

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    let venueName: string | null = null;
    let venueCity: string | null = null;
    let artistName: string | null = null;
    let artistCity: string | null = null;
    let eventName: string | null = null;

    if (data.artist_id) {
      const { data: artist } = await supabase
        .from('artists')
        .select('id, name, city')
        .eq('id', data.artist_id)
        .maybeSingle();

      artistName = artist?.name ?? null;
      artistCity = artist?.city ?? null;
    }

    if (data.venue_id) {
      const { data: venue } = await supabase
        .from('venues')
        .select('id, name, city')
        .eq('id', data.venue_id)
        .maybeSingle();
      venueName = venue?.name ?? null;
      venueCity = venue?.city ?? null;
    }

    if (data.event_id) {
      const { data: event } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', data.event_id)
        .maybeSingle();
      eventName = event?.name ?? null;
    }

    return new Booking({
      id: data.id,
      artistId: data.artist_id,
      artistName,
      artistCity,
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
      updatedAt: data.updated_at ? new Date(data.updated_at) : null,
      venueName,
      venueCity,
      eventName,
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

        total_amount: booking.totalAmount,

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

    const venueIds = Array.from(new Set((data ?? []).map((row: any) => row.venue_id).filter(Boolean)));
    const eventIds = Array.from(new Set((data ?? []).map((row: any) => row.event_id).filter(Boolean)));

    const venueMap = new Map<string, { name: string | null; city: string | null }>();
    if (venueIds.length) {
      const { data: venuesData } = await supabase
        .from('venues')
        .select('id, name, city')
        .in('id', venueIds);

      venuesData?.forEach((v: any) => {
        venueMap.set(v.id, { name: v.name ?? null, city: v.city ?? null });
      });
    }

    const eventNameMap = new Map<string, string>();
    if (eventIds.length) {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name')
        .in('id', eventIds);

      eventsData?.forEach((e: any) => {
        eventNameMap.set(e.id, e.name ?? 'Evento');
      });
    }

    return data.map((row: any) => {
      const venueInfo = row.venue_id ? venueMap.get(row.venue_id) : undefined;
      const eventName = row.event_id ? eventNameMap.get(row.event_id) : undefined;

      return new Booking({
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
        handledAt: row.handled_at ? new Date(row.handled_at) : null,
        updatedAt: row.updated_at ? new Date(row.updated_at) : null,
        venueName: venueInfo?.name ?? null,
        venueCity: venueInfo?.city ?? null,
        eventName: eventName ?? null,
      });
    });
  }

  async findByVenueId(venueId: string): Promise<Booking[]> {
    console.log('ide busqueda booking ', venueId);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    const artistIds = Array.from(new Set((data ?? []).map((row: any) => row.artist_id).filter(Boolean)));
    const artistMap = new Map<string, { name: string | null; city: string | null }>();

    if (artistIds.length) {
      const { data: artistsData } = await supabase
        .from('artists')
        .select('id, name, city')
        .in('id', artistIds);

      artistsData?.forEach((artist: any) => {
        artistMap.set(artist.id, { name: artist.name ?? null, city: artist.city ?? null });
      });
    }

    return data.map((row) => {
      const artistInfo = row.artist_id ? artistMap.get(row.artist_id) : undefined;

      return new Booking({
        id: row.id,
        artistId: row.artist_id,
        artistName: artistInfo?.name ?? null,
        artistCity: artistInfo?.city ?? null,
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
      });
    });
  }


  async findByPromoterId(promoterId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('promoter_id', promoterId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    const artistIds = Array.from(new Set((data ?? []).map((row: any) => row.artist_id).filter(Boolean)));
    const venueIds = Array.from(new Set((data ?? []).map((row: any) => row.venue_id).filter(Boolean)));
    const eventIds = Array.from(new Set((data ?? []).map((row: any) => row.event_id).filter(Boolean)));
    const artistMap = new Map<string, { name: string | null; city: string | null }>();

    if (artistIds.length) {
      const { data: artistsData } = await supabase
        .from('artists')
        .select('id, name, city')
        .in('id', artistIds);

      artistsData?.forEach((artist: any) => {
        artistMap.set(artist.id, { name: artist.name ?? null, city: artist.city ?? null });
      });
    }

    const venueMap = new Map<string, { name: string | null; city: string | null }>();
    if (venueIds.length) {
      const { data: venuesData } = await supabase
        .from('venues')
        .select('id, name, city')
        .in('id', venueIds);

      venuesData?.forEach((venue: any) => {
        venueMap.set(venue.id, { name: venue.name ?? null, city: venue.city ?? null });
      });
    }

    const eventNameMap = new Map<string, string>();
    if (eventIds.length) {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name')
        .in('id', eventIds);

      eventsData?.forEach((event: any) => {
        eventNameMap.set(event.id, event.name ?? 'Evento');
      });
    }

    return data.map((row) => {
      const artistInfo = row.artist_id ? artistMap.get(row.artist_id) : undefined;
      const venueInfo = row.venue_id ? venueMap.get(row.venue_id) : undefined;
      const eventName = row.event_id ? eventNameMap.get(row.event_id) : undefined;

      return new Booking({
        id: row.id,
        artistId: row.artist_id,
        artistName: artistInfo?.name ?? null,
        artistCity: artistInfo?.city ?? null,
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
        venueName: venueInfo?.name ?? null,
        venueCity: venueInfo?.city ?? null,
        eventName: eventName ?? null,
      });
    });
  }  async findActiveByVenueId(
    venueId: string,
  ): Promise<
    {
      booking: Booking;
      artistName: string;
    }[]
  > {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
      *,
      artists (
        name
      )
    `)
      .eq('venue_id', venueId)
      .in('status', [
        'PENDING',
        'FINAL_OFFER_SENT',
        'ACCEPTED',
        'CONTRACT_SIGNED',
        'NEGOTIATING',
        'PAID_PARTIAL',
        'PAID_FULL',
      ])
      .order('start_date', { ascending: true })
      .limit(5);

    if (error || !data) return [];

    return data.map((row: any) => ({
      booking: new Booking({
        id: row.id,
        artistId: row.artist_id,
        venueId: row.venue_id,
        promoterId: row.promoter_id ?? null,
        managerId: row.manager_id ?? null,
        eventId: row.event_id ?? null,

        status: row.status,
        start_date: row.start_date,
        currency: row.currency,
        totalAmount: row.total_amount,

        handledByRole: row.handled_by_role ?? null,
        handledByUserId: row.handled_by_user_id ?? null,
        handledAt: row.handled_at ? new Date(row.handled_at) : null,

        artistStripeAccountId: row.artist_stripe_account_id ?? null,
        managerStripeAccountId: row.manager_stripe_account_id ?? null,
        artimeCommissionPercentage: row.artime_commission_percentage ?? null,
        managerCommissionPercentage: row.manager_commission_percentage ?? null,

        createdAt: new Date(row.created_at),
      }),
      artistName: row.artists?.name ?? '—',
    }));
  }

  async findActiveByArtistId(
    artistId: string,
  ): Promise<
    {
      booking: Booking;
      venueName: string;
    }[]
  > {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('artist_id', artistId)
      .in('status', [
        'PENDING',
        'FINAL_OFFER_SENT',
        'ACCEPTED',
        'CONTRACT_SIGNED',
        'NEGOTIATING',
        'PAID_PARTIAL',
        'PAID_FULL',
        'COMPLETED',
      ])
      .order('start_date', { ascending: true })
      .limit(5);

    if (error || !data) return [];

    const venueIds = Array.from(new Set(data.map((row) => row.venue_id).filter(Boolean)));
    const venueNames = new Map<string, string>();

    if (venueIds.length) {
      const { data: venuesData } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', venueIds);

      venuesData?.forEach((venue) => {
        venueNames.set(venue.id, venue.name);
      });
    }

    return data.map((row: any) => ({
      booking: new Booking({
        id: row.id,
        artistId: row.artist_id,
        venueId: row.venue_id,
        promoterId: row.promoter_id ?? null,
        managerId: row.manager_id ?? null,
        eventId: row.event_id ?? null,

        status: row.status,
        start_date: row.start_date,
        currency: row.currency,
        totalAmount: row.total_amount,

        handledByRole: row.handled_by_role ?? null,
        handledByUserId: row.handled_by_user_id ?? null,
        handledAt: row.handled_at ? new Date(row.handled_at) : null,

        artistStripeAccountId: row.artist_stripe_account_id ?? null,
        managerStripeAccountId: row.manager_stripe_account_id ?? null,
        artimeCommissionPercentage: row.artime_commission_percentage ?? null,
        managerCommissionPercentage: row.manager_commission_percentage ?? null,

        createdAt: new Date(row.created_at),
      }),
      venueName: venueNames.get(row.venue_id) ?? '—',
    }));
  }
  async findByIds(ids: string[]): Promise<Artist[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .in('id', ids);

    if (error || !data) return [];

    return data.map(
      (row) =>
        new Artist({
          id: row.id,
          email: row.email,
          stripeOnboardingStatus: row.stripe_onboarding_status,
          name: row.name,
          city: row.city,
          genres: row.genres,
          basePrice: row.base_price,
          currency: row.currency,
          isNegotiable: row.is_negotiable,
          bio: row.bio,
          format: row.format,
          stripeAccountId: row.stripe_account_id,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          rating: row.rating ?? undefined,
          managerId: row.manager_id ?? null,
        }),
    );
  }

  async findConfirmedByArtistAndDate(
    artistId: string,
    date: string,
  ): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('artist_id', artistId)
      .eq('start_date', date)
      .in('status', [
        'ACCEPTED',
        'CONTRACT_SIGNED',
        'PAID_PARTIAL',
        'PAID_FULL',
        'COMPLETED',
      ])
      .maybeSingle();

    if (error || !data) return null;

    return new Booking({
      id: data.id,
      artistId: data.artist_id,
      venueId: data.venue_id,
      promoterId: data.promoter_id ?? null,
      managerId: data.manager_id ?? null,
      eventId: data.event_id ?? null,

      status: data.status,
      start_date: data.start_date,
      currency: data.currency,
      totalAmount: data.total_amount,

      handledByRole: data.handled_by_role ?? null,
      handledByUserId: data.handled_by_user_id ?? null,
      handledAt: data.handled_at ? new Date(data.handled_at) : null,

      artistStripeAccountId: data.artist_stripe_account_id ?? null,
      managerStripeAccountId: data.manager_stripe_account_id ?? null,
      artimeCommissionPercentage: data.artime_commission_percentage ?? null,
      managerCommissionPercentage: data.manager_commission_percentage ?? null,

      createdAt: new Date(data.created_at),
    });
  }



}
