import { EventBookingLink } from '../entities/event-booking-link.entity';

export interface EventBookingLinkRepository {
  create(link: EventBookingLink): Promise<EventBookingLink>;
  findByEvent(eventId: string): Promise<EventBookingLink[]>;
  findByBooking(bookingId: string): Promise<EventBookingLink | null>;
  update(link: EventBookingLink): Promise<EventBookingLink>;
}
