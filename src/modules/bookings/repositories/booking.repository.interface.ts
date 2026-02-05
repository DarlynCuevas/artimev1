import type { Booking } from '../booking.entity';

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  save(booking: Booking): Promise<void>;
  update(booking: Booking): Promise<void>;
  findByArtistId(artistId: string): Promise<Booking[]>;
  findByVenueId(venueId: string): Promise<Booking[]>;
  findByPromoterId(promoterId: string): Promise<Booking[]>;
  findActiveByVenueId(venueId: string): Promise<Array<{ booking: Booking; artistName: string }>>;
  findActiveByArtistId(artistId: string): Promise<Array<{ booking: Booking; venueName: string }>>;
  findByManagerId(managerId: string): Promise<Booking[]>;
  findActionRequiredByManagerId(managerId: string, limit?: number): Promise<Array<{ booking: Booking; artistName: string; partnerName: string }>>;
  findConfirmedByArtistAndDate(artistId: string, date: string): Promise<Booking | null>;
  


}

