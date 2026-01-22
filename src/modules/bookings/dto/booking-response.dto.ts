export class BookingResponseDto {
  id: string;
  artistId: string;
  artistName?: string | null;
  artistCity?: string | null;
  venueId: string;
  venueName?: string | null;
  venueCity?: string | null;
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
