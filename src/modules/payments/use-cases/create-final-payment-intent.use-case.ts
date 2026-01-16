import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/boobking/SupabaseBookingRepository ';
import { PaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';
import { PaymentMilestoneStatus } from '../payment-milestone-status.enum';

export class CreateFinalPaymentIntentUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async execute(input: {
    bookingId: string;
  }): Promise<{ clientSecret: string }> {
    const booking = await this.supabaseBookingRepository.findById(input.bookingId);

    if (!booking || booking.status !== BookingStatus.PAID_PARTIAL) {
      throw new Error('Booking not eligible for final payment');
    }

    const schedule =
      await this.paymentRepository.findScheduleByBookingId(booking.id);

    if (!schedule) {
      throw new Error('Payment schedule not found');
    }

    const milestones =
      await this.paymentRepository.findMilestonesByScheduleId(schedule.id);

    const finalMilestone = milestones.find(
      (m) => m.type === PaymentMilestoneType.FINAL,
    );

    if (
      !finalMilestone ||
      finalMilestone.status !== PaymentMilestoneStatus.PENDING
    ) {
      throw new Error('Final milestone not payable');
    }

    const intent = await this.paymentProvider.createPaymentIntent({
      amount: finalMilestone.amount,
      currency: schedule.currency,
      metadata: {
        bookingId: booking.id,
        milestoneId: finalMilestone.id,
        type: 'FINAL',
      },
    });

    await this.paymentRepository.attachProviderPaymentId(
      finalMilestone.id,
      intent.providerPaymentId,
    );

    return { clientSecret: intent.clientSecret };
  }
}
