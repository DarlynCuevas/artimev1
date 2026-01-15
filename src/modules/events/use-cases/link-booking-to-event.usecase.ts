import { EventBookingLinkRepository } from '../repositories/event-booking-link.repository';

export class LinkBookingToEventUseCase {
  constructor(
    private readonly eventBookingLinkRepository: EventBookingLinkRepository
  ) {}

  async execute(eventId: string, bookingId: string) {
    const existing =
      await this.eventBookingLinkRepository.findByBooking(bookingId);

    if (existing) {
      throw new Error('Booking already linked to an event');
    }

    return this.eventBookingLinkRepository.create({
      id: crypto.randomUUID(),
      event_id: eventId,
      booking_id: bookingId,
      created_at: new Date(),
    });
  }
}
