import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/bookings/SupabaseBookingRepository';
import { DbPaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';
import { PaymentMilestoneStatus } from '../payment-milestone-status.enum';

export class CreateFinalPaymentIntentUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly paymentRepository: DbPaymentRepository,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async execute(input: {
    bookingId: string;
  }): Promise<{ clientSecret: string }> {
    console.log('[CreateFinalPaymentIntentUseCase] Ejecutando con bookingId:', input.bookingId);
    const booking = await this.supabaseBookingRepository.findById(input.bookingId);
    console.log('[CreateFinalPaymentIntentUseCase] Booking encontrado:', booking);

    if (!booking || booking.status !== BookingStatus.PAID_PARTIAL) {
      console.error('[CreateFinalPaymentIntentUseCase] Booking no elegible para pago final', { booking });
      throw new Error('Booking not eligible for final payment');
    }

    const schedule = await this.paymentRepository.findScheduleByBookingId(booking.id);
    console.log('[CreateFinalPaymentIntentUseCase] Schedule encontrado:', schedule);

    if (!schedule) {
      console.error('[CreateFinalPaymentIntentUseCase] No se encontró el payment schedule', { bookingId: booking.id });
      throw new Error('Payment schedule not found');
    }

    const milestones = await this.paymentRepository.findMilestonesByScheduleId(schedule.id);
    console.log('[CreateFinalPaymentIntentUseCase] Milestones encontrados:', milestones);

    const finalMilestone = milestones.find((m) => m.type === PaymentMilestoneType.FINAL);
    console.log('[CreateFinalPaymentIntentUseCase] Final milestone:', finalMilestone);

    if (!finalMilestone || finalMilestone.status !== PaymentMilestoneStatus.PENDING) {
      console.error('[CreateFinalPaymentIntentUseCase] Final milestone no pagable', { finalMilestone });
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
      idempotencyKey: `final-${finalMilestone.id}`,
    });
    console.log('[CreateFinalPaymentIntentUseCase] Intent creado:', intent);

    await this.paymentRepository.attachProviderPaymentId(finalMilestone.id, intent.providerPaymentId);
    console.log('[CreateFinalPaymentIntentUseCase] ProviderPaymentId asociado:', intent.providerPaymentId);

    return { clientSecret: intent.clientSecret };
  }
}
