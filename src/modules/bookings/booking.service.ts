// booking.service.ts

// booking.service.ts

import { BookingStatus } from './booking-status.enum';
import { Booking } from './booking.entity';

export class BookingService {
  changeStatus(
    booking: Booking,
    nextStatus: BookingStatus,
  ): Booking {
    booking.changeStatus(nextStatus);
    return booking;
  }
}
