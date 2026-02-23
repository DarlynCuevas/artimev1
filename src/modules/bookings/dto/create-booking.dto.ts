import type { ArtistBookingConditions } from '../../artists/types/artist-booking-conditions';

export class CreateBookingDto {
  artistId: string;
  currency?: string;
  totalAmount?: number;
  allIn?: boolean;
  artistConditionsSnapshot?: ArtistBookingConditions | null;

  // 👇 opcional (viene de Event)
  eventId?: string;

  // Fecha de inicio del evento (opcional)
  start_date?: string;

  // Mensaje inicial de negociación (opcional)
  message?: string;
}
