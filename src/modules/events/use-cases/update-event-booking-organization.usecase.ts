import { EventBookingLinkRepository } from '../repositories/event-booking-link.repository';

type Payload = {
  event_day_id?: string;
  order?: number;
  start_time?: string;
  end_time?: string;
};

export class UpdateEventBookingOrganizationUseCase {
  constructor(
    private readonly eventBookingLinkRepository: EventBookingLinkRepository
  ) {}

  async execute(bookingId: string, payload: Payload) {
    const link =
      await this.eventBookingLinkRepository.findByBooking(bookingId);

    if (!link) {
      throw new Error('Booking not linked to any event');
    }

    return this.eventBookingLinkRepository.update({
      ...link,
      ...payload,
    });
  }
}
