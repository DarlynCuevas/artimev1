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
    city: string;
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
}