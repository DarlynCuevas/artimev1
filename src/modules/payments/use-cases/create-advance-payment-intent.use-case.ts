import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/boobking/SupabaseBookingRepository ';
import { PaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';

export class CreateAdvancePaymentIntentUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async execute(input: {
    bookingId: string;
  }): Promise<{ clientSecret: string }> {
    const booking = await this.supabaseBookingRepository.findById(input.bookingId);

    if (!booking || booking.status !== BookingStatus.CONTRACT_SIGNED) {
      throw new Error('Booking not eligible for advance payment');
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

    if (!advance || advance.status !== 'PENDING') {
      throw new Error('Advance milestone not payable');
    }

    const intent = await this.paymentProvider.createPaymentIntent({
      amount: advance.amount,
      currency: schedule.currency,
      metadata: {
        bookingId: booking.id,
        milestoneId: advance.id,
        type: 'ADVANCE',
      },
    });

    await this.paymentRepository.attachProviderPaymentId(
      advance.id,
      intent.providerPaymentId,
    );

    return { clientSecret: intent.clientSecret };
  }
}
