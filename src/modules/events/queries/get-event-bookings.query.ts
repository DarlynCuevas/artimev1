import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';


@Injectable()
export class GetEventBookingsQuery {
  constructor(
    private readonly supabase: SupabaseClient,
  ) {}

  async execute(eventId: string) {
    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        id,
        status,
        start_date,
        artist:artists (
          id,
          name
        )
      `)
      .eq('event_id', eventId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
