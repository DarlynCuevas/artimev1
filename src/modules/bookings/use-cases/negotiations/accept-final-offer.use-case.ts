// accept-final-offer.use-case.ts

import { BookingStatus } from '../../booking-status.enum';
import { BookingRepository } from '../../../../infrastructure/database/repositories/booking.repository';

export class AcceptFinalOfferUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.FINAL_OFFER_SENT) {
      throw new Error(
        'Final offer can only be accepted when booking is in FINAL_OFFER_SENT state',
      );
    }

    booking.changeStatus(BookingStatus.ACCEPTED);

    await this.bookingRepository.update(booking);
  }
}

