import type { Booking } from '../booking.entity';

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  save(booking: Booking): Promise<void>;
  update(booking: Booking): Promise<void>;
  findByArtistId(artistId: string): Promise<Booking[]>;
  findByVenueId(venueId: string): Promise<Booking[]>;
  findByManagerId(managerId: string): Promise<Booking[]>;

}

