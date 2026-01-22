export class BookingResponseDto {
  id: string;
  artistId: string;
  venueId: string;
  promoterId: string | null;
  managerId?: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  eventId?: string;
  start_date: string;
  messagesCount: number;
  lastMessage: {
    senderRole: string;
    senderUserId: string;
  } | null;
}
