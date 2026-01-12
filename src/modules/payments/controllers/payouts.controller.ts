import { Controller, Post, Param } from '@nestjs/common';
import { CreatePayoutForBookingUseCase } from '../use-cases/payouts/create-payout-for-booking.use-case';

@Controller('internal/payouts')
export class PayoutsController {
  constructor(
    private readonly createPayoutForBookingUseCase: CreatePayoutForBookingUseCase,
  ) {}

  /**
   * Endpoint técnico de prueba (v1)
   * Crea el payout para un booking COMPLETED
   */
  @Post(':bookingId')
  async create(@Param('bookingId') bookingId: string) {
    return this.createPayoutForBookingUseCase.execute({ bookingId });
  }
}
