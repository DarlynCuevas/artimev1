// pay-advance.use-case.ts


import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';
import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/bookings/SupabaseBookingRepository';
import { DbPaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';

export class PayAdvanceUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly paymentRepository: DbPaymentRepository,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.supabaseBookingRepository.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.CONTRACT_SIGNED) {
      throw new Error(
        'Advance can only be paid when booking is in CONTRACT_SIGNED state',
      );
    }

    const schedule = await this.paymentRepository.findScheduleByBookingId(booking.id);
    if (!schedule) {
      throw new Error('Payment schedule not found');
    }

    const milestones = await this.paymentRepository.findMilestonesByScheduleId(schedule.id);
    const advance = milestones.find((m) => m.type === PaymentMilestoneType.ADVANCE);

    if (!advance) {
      throw new Error('Advance milestone not found');
    }

    if (advance.paidAt) {
      throw new Error('Advance already paid');
    }

    advance.markAsPaid(new Date());
    await this.paymentRepository.updateMilestone(advance);

    booking.changeStatus(BookingStatus.PAID_PARTIAL);
    await this.supabaseBookingRepository.update(booking);
  }
}
