import { Injectable, Inject } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '../../providers/payment-provider.token';
import type { PaymentProvider } from '../../providers/payment-provider.interface';
// Importa el repositorio de bookings y el repositorio de payment intents si existe
// import { BOOKING_REPOSITORY } from '../../../bookings/repositories/booking-repository.token';
// import type { BookingRepository } from '../../../bookings/repositories/booking.repository.interface';
// import { PAYMENT_INTENT_REPOSITORY } from '../../repositories/payment-intent-repository.token';
// import type { PaymentIntentRepository } from '../../repositories/payment-intent.repository.interface';

@Injectable()
export class CreatePaymentIntentUseCase {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
    // @Inject(BOOKING_REPOSITORY)
    // private readonly bookingRepository: BookingRepository,
    // @Inject(PAYMENT_INTENT_REPOSITORY)
    // private readonly paymentIntentRepository: PaymentIntentRepository,
  ) {}

  async execute(input: { bookingId: string }): Promise<{ clientSecret: string }> {
    // 1. Buscar el booking y calcular el importe (a implementar)
    // const booking = await this.bookingRepository.findById(input.bookingId);
    // const amount = calcularImporte(booking);
    // const currency = booking.currency;

    // 2. Crear el PaymentIntent en Stripe
    const paymentIntent = await this.paymentProvider.createPaymentIntent({
      amount: 0, // TODO: poner el importe real
      currency: 'eur', // TODO: poner la moneda real
      metadata: {
        bookingId: input.bookingId,
      },
    });

    // 3. Guardar referencia en DB (a implementar)
    // await this.paymentIntentRepository.save({ ... });

    return { clientSecret: paymentIntent.clientSecret };
  }
}
