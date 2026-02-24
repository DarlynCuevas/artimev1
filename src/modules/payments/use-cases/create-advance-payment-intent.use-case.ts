import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/bookings/SupabaseBookingRepository';
import { DbPaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import type { PaymentIntentRepository } from '../repositories/payment-intent.repository.interface';
import { PaymentProvider } from '../providers/payment-provider.interface';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { PaymentMilestoneType } from '../payment-milestone.entity';

const toMinorUnits = (amount: number) => Math.round(amount * 100);

export class CreateAdvancePaymentIntentUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly paymentRepository: DbPaymentRepository,
    private readonly paymentProvider: PaymentProvider,
    private readonly paymentIntentRepository: PaymentIntentRepository,
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

    const idempotencyKey = `advance-${advance.id}`;
    const existingIntent =
      await this.paymentIntentRepository.findByIdempotencyKey(
        idempotencyKey,
      );

    if (existingIntent?.clientSecret) {
      return { clientSecret: existingIntent.clientSecret };
    }

    if (existingIntent?.providerPaymentId) {
      const intent =
        await this.paymentProvider.retrievePaymentIntent(
          existingIntent.providerPaymentId,
        );
      const clientSecret = intent.client_secret ?? null;

      await this.paymentIntentRepository.updateByIdempotencyKey(
        idempotencyKey,
        {
          providerPaymentId: intent.id,
          clientSecret,
          status: intent.status,
        },
      );

      if (!clientSecret) {
        throw new Error('PaymentIntent has no client_secret');
      }

      return { clientSecret };
    }

    const intent = await this.paymentProvider.createPaymentIntent({
      amount: toMinorUnits(advance.amount),
      currency: schedule.currency,
      metadata: {
        bookingId: booking.id,
        milestoneId: advance.id,
        type: 'ADVANCE',
      },
      idempotencyKey,
    });

    await this.paymentRepository.attachProviderPaymentId(
      advance.id,
      intent.providerPaymentId,
    );

    await this.paymentIntentRepository.save({
      provider: 'stripe',
      bookingId: booking.id,
      milestoneId: advance.id,
      amount: advance.amount,
      currency: schedule.currency,
      status: intent.status,
      providerPaymentId: intent.providerPaymentId,
      clientSecret: intent.clientSecret,
      idempotencyKey,
      metadata: {
        bookingId: booking.id,
        milestoneId: advance.id,
        type: 'ADVANCE',
      },
    });

    return { clientSecret: intent.clientSecret };
  }
}
