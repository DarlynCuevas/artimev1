// pay-final.use-case.ts

import { Booking } from '../../bookings/booking.entity';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentSchedule } from '../payment-schedule.entity';
import { PaymentMilestoneType } from '../payment-milestone.entity';

export class PayFinalUseCase {
  execute(
    booking: Booking,
    paymentSchedule: PaymentSchedule,
  ): void {
    if (booking.status !== BookingStatus.PAID_PARTIAL) {
      throw new Error(
        'Final payment can only be paid when booking is in PAID_PARTIAL state',
      );
    }

    const finalMilestone = paymentSchedule.milestones.find(
      (m) => m.type === PaymentMilestoneType.FINAL,
    );

    if (!finalMilestone) {
      throw new Error('Final payment milestone not found');
    }

    if (finalMilestone.isPaid()) {
      throw new Error('Final payment already paid');
    }

    finalMilestone.markAsPaid();
    booking.changeStatus(BookingStatus.PAID_FULL);
  }
}
