import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';

@Injectable()
export class ArtistCalendarBlockRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async findByArtistAndDate(artistId: string, date: string) {
    return this.supabase
      .from('artist_calendar_blocks')
      .select('*')
      .eq('artist_id', artistId)
      .eq('date', date)
      .maybeSingle();
  }

  async create(data: { artist_id: string; date: string; reason?: string }) {
    return this.supabase
      .from('artist_calendar_blocks')
      .insert(data)
      .select()
      .single();
  }

  async findByArtistBetween(artistId: string, from: string, to: string) {
    return this.supabase
      .from('artist_calendar_blocks')
      .select('*')
      .eq('artist_id', artistId)
      .gte('date', from)
      .lte('date', to);
  }

  async deleteByArtistAndDate(artistId: string, date: string) {
    return this.supabase
      .from('artist_calendar_blocks')
      .delete()
      .eq('artist_id', artistId)
      .eq('date', date);
  }
}
