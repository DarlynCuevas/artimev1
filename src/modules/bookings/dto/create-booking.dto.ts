export class CreateBookingDto {
  artistId: string;
  currency: string;
  totalAmount: number;

  // 👇 opcional (viene de Event)
  eventId?: string;
}
