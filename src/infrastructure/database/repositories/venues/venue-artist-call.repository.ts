import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';

@Injectable()
export class VenueArtistCallRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async createCall(params: {
    venueId: string;
    date: string;
    city: string | null;
    filters?: Record<string, any>;
  }) {
    const { data, error } = await this.supabase
      .from('venue_artist_calls')
      .insert({
        venue_id: params.venueId,
        date: params.date,
        city: params.city,
        filters: params.filters ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async findInterestedByVenue(venueId: string) {
    const { data, error } = await this.supabase
      .from('venue_artist_call_responses')
      .select(`
        call_id,
        response,
        responded_at,
        artist:artists(
          id,
          name,
          city,
          base_price,
          currency
        ),
        call:venue_artist_calls!inner(
          id,
          venue_id,
          date,
          city,
          filters
        )
      `)
      .eq('response', 'INTERESTED')
      .eq('call.venue_id', venueId)
      .order('responded_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      callId: row.call_id,
      date: row.call?.date ?? null,
      city: row.call?.city ?? null,
      offeredPrice: row.call?.filters?.maxPrice ?? null,
      artistId: row.artist?.id ?? null,
      artistName: row.artist?.name ?? 'Artista',
      artistCity: row.artist?.city ?? null,
      basePrice: row.artist?.base_price ?? null,
      currency: row.artist?.currency ?? 'EUR',
      respondedAt: row.responded_at,
    }));
  }
}