import type { Booking } from '../booking.entity';

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  save(booking: Booking): Promise<void>;
  update(booking: Booking): Promise<void>;
  findByArtistId(artistId: string): Promise<Booking[]>;
  findByVenueId(venueId: string): Promise<Booking[]>;
  findActiveByVenueId(venueId: string): Promise<Array<{ booking: Booking; artistName: string }>>;
  findActiveByArtistId(artistId: string): Promise<Array<{ booking: Booking; venueName: string }>>;
  findByManagerId(managerId: string): Promise<Booking[]>;
  findConfirmedByArtistAndDate(artistId: string, date: string): Promise<Booking | null>;
  


}

