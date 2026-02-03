export class CreateBookingDto {
  artistId: string;
  currency?: string;
  totalAmount?: number;

  // 👇 opcional (viene de Event)
  eventId?: string;

  // Fecha de inicio del evento (opcional)
  start_date?: string;

  // Mensaje inicial de negociación (opcional)
  message?: string;
}
