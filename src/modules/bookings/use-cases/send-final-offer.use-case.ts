// send-final-offer.use-case.ts

import { Booking } from '../booking.entity';
import { BookingStatus } from '../booking-status.enum';

export class SendFinalOfferUseCase {
  execute(booking: Booking): Booking {
    booking.changeStatus(BookingStatus.FINAL_OFFER_SENT);
    return booking;
  }
}
