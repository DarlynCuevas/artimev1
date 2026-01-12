import { Controller, Post, Param, Body } from '@nestjs/common';
import { CancelBookingUseCase } from '../use-cases/cancel-booking.use-case';

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
      initiatedBy: 'ARTIST' | 'VENUE' | 'SYSTEM';
      reason?: string;
    },
  ) {
    await this.cancelBookingUseCase.execute({
      bookingId,
      initiatedBy: body.initiatedBy,
      reason: body.reason,
    });

    return { status: 'CANCELLED' };
  }
}
