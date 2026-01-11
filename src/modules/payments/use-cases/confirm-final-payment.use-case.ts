import { BookingRepository } from '../../../infrastructure/database/repositories/booking.repository';
import { PaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';

export class ConfirmFinalPaymentUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    providerPaymentId: string;
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);

    if (!booking || booking.status !== BookingStatus.PAID_PARTIAL) {
      throw new Error('Booking not eligible for final payment confirmation');
    }

    const schedule =
      await this.paymentRepository.findScheduleByBookingId(booking.id);

    if (!schedule) {
      throw new Error('Payment schedule not found');
    }

    const milestones =
      await this.paymentRepository.findMilestonesByScheduleId(schedule.id);

    const finalMilestone = milestones.find(
      (m) =>
        m.type === PaymentMilestoneType.FINAL &&
        m.providerPaymentId === input.providerPaymentId,
    );

    if (!finalMilestone) {
      throw new Error('Final milestone not found');
    }

    finalMilestone.markAsPaid(new Date());
    await this.paymentRepository.updateMilestone(finalMilestone);

    booking.changeStatus(BookingStatus.PAID_FULL);
    await this.bookingRepository.update(booking);
  }
}
