import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/bookings/SupabaseBookingRepository ';
import { DbPaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';

export class ConfirmAdvancePaymentUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly paymentRepository: DbPaymentRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    providerPaymentId: string;
  }): Promise<void> {
    const booking = await this.supabaseBookingRepository.findById(input.bookingId);

    if (!booking || booking.status !== BookingStatus.CONTRACT_SIGNED) {
      throw new Error('Booking not eligible for confirmation');
    }


    const schedule = await this.paymentRepository.findScheduleByBookingId(booking.id);
    if (!schedule) {
      throw new Error('Payment schedule not found');
    }

    const milestones = await this.paymentRepository.findMilestonesByScheduleId(schedule.id);

    const advance = milestones.find(
      (m) =>
        m.type === PaymentMilestoneType.ADVANCE &&
        m.providerPaymentId === input.providerPaymentId,
    );

    if (!advance) {
      throw new Error('Advance milestone not found');
    }

    advance.markAsPaid(new Date());
    await this.paymentRepository.updateMilestone(advance);

    booking.changeStatus(BookingStatus.PAID_PARTIAL);
    await this.supabaseBookingRepository.update(booking);
  }
}
