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
  eventId?: string | null;
  start_date: string;
  handledAt?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  messagesCount: number;
  lastMessage: {
    senderRole: string;
    senderUserId: string;
  } | null;
}
