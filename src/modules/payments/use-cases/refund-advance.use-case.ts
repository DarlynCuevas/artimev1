import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/SupabaseBookingRepository ';
import { PaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';
import { PaymentMilestoneStatus } from '../payment-milestone-status.enum';

export class RefundAdvanceUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.supabaseBookingRepository.findById(bookingId);

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

    if (advance.status !== PaymentMilestoneStatus.PAID) {
      throw new Error('Advance milestone is not refundable');
    }

    if (!advance.providerPaymentId) {
      throw new Error('Missing provider payment reference');
    }

    // 1️ Stripe refund
    await this.paymentProvider.refundPayment({
      providerPaymentId: advance.providerPaymentId,
    });

    // 2️ Dominio
    advance.markAsRefunded(new Date());

    // 3️ Persistencia
    await this.paymentRepository.updateMilestone(advance);
  }
}
