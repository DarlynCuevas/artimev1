import { BookingRepository } from '../../../infrastructure/database/repositories/booking.repository';
import { PaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';

export class RefundAdvanceUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking || booking.status !== BookingStatus.CANCELLED) {
      throw new Error('Booking is not eligible for refund');
    }

    const schedule =
      await this.paymentRepository.findScheduleByBookingId(booking.id);

    if (!schedule) {
      throw new Error('Payment schedule not found');
    }

    const milestones =
      await this.paymentRepository.findMilestonesByScheduleId(schedule.id);

    const advance = milestones.find(
      (m) => m.type === PaymentMilestoneType.ADVANCE,
    );

    if (!advance) {
      throw new Error('Advance milestone not found');
    }

    advance.markAsRefunded(new Date());
    await this.paymentRepository.updateMilestone(advance);
  }
}
