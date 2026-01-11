// complete-booking.use-case.ts

import { BookingStatus } from "src/modules/bookings/booking-status.enum";
import { Booking } from "src/modules/bookings/booking.entity";



export class CompleteBookingUseCase {
  execute(booking: Booking): Booking {
    if (booking.status !== BookingStatus.PAID_FULL) {
      throw new Error(
        'Booking can only be completed when fully paid',
      );
    }

    booking.changeStatus(BookingStatus.COMPLETED);

    return booking;
  }
}
