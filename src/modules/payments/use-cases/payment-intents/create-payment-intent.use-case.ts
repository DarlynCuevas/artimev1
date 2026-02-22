import { Injectable, Inject } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '../../providers/payment-provider.token';
import type { PaymentProvider } from '../../providers/payment-provider.interface';
import { BOOKING_REPOSITORY } from '../../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../../bookings/repositories/booking.repository.interface';
import { NotFoundException } from '@nestjs/common';
// import { PAYMENT_INTENT_REPOSITORY } from '../../repositories/payment-intent-repository.token';
// import type { PaymentIntentRepository } from '../../repositories/payment-intent.repository.interface';

@Injectable()
export class CreatePaymentIntentUseCase {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    // @Inject(PAYMENT_INTENT_REPOSITORY)
    // private readonly paymentIntentRepository: PaymentIntentRepository,
  ) { }

  async execute(input: { bookingId: string }): Promise<{ clientSecret: string }> {
    // 1. Buscar el booking y calcular el importe
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking con id ${input.bookingId} no encontrado`);
    }

    // Stripe espera el importe en la unidad mínima de la moneda (por ejemplo, céntimos para EUR)
    const amountInCents = Math.round(booking.totalAmount * 100);
    const currency = booking.currency?.toLowerCase() || 'eur';

    // 2. Crear el PaymentIntent en Stripe
    const paymentIntent = await this.paymentProvider.createPaymentIntent({
      amount: amountInCents,
      currency: currency,
      metadata: {
        bookingId: input.bookingId,
      },
    });

    // 3. Guardar referencia en DB (a implementar)
    // await this.paymentIntentRepository.save({ ... });

    return { clientSecret: paymentIntent.clientSecret };
  }
}
