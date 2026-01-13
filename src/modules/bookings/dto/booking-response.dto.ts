export class BookingResponseDto {
  id: string;
  artistId: string;
  venueId: string;
  promoterId: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  eventId?: string;
  start_date: string;
}
