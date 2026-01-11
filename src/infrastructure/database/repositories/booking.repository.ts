// booking.repository.ts

import { supabase } from '../supabase.client';
import { Booking } from '../../../modules/bookings/booking.entity';
import { BookingStatus } from '../../../modules/bookings/booking-status.enum';

export class BookingRepository {
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
    });
  }

  async save(booking: Booking): Promise<void> {
    const persistence = {
      id: booking.id,
      artist_id: booking.artistId,
      venue_id: booking.venueId,
      promoter_id: booking.promoterId,
      status: booking.status,
    };

    await supabase.from('bookings').insert(persistence);
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
