import { Controller, Post, Param, Body } from '@nestjs/common';
import { CancelBookingUseCase } from '../use-cases/cancel-booking.use-case';
import { CancellationInitiator } from 'src/modules/bookings/cancellations/cancellation-initiator.enum';

@Controller('internal/cancellations')
export class CancellationsController {
  constructor(
    private readonly cancelBookingUseCase: CancelBookingUseCase,
  ) {}

  /**
   * Endpoint técnico de prueba (v1)
   * Cancela un booking y crea un cancellation_record
   */
  @Post(':bookingId')
  async cancel(
    @Param('bookingId') bookingId: string,
    @Body()
    body: {
      initiator: CancellationInitiator;
      reason?: string;
    },
  ) {
    await this.cancelBookingUseCase.execute({
      bookingId,
      initiator: body.initiator,
      reason: body.reason,
    });

    return { status: 'CANCELLED' };
  }
}
