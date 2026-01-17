import { Body, Controller, Param, Post } from "@nestjs/common";
import { CancelBookingUseCase } from "../use-cases/cancel-booking.use-case";
import { CancellationInitiator } from "../cancellation-initiator.enum";
import { CancellationReason } from "../cancellation-reason.enum";

@Controller('internal/cancellations')
export class CancellationsController {
  constructor(
    private readonly cancelBookingUseCase: CancelBookingUseCase,
  ) {}

  /**
   * Endpoint (v1)
   * Cancela un booking y crea un cancellation_record
   */
  @Post(':bookingId')
  async cancel(
    @Param('bookingId') bookingId: string,
    @Body()
    body: {
      initiator: CancellationInitiator;
      reason?: CancellationReason;
      description?: string;
    },
  ) {
    await this.cancelBookingUseCase.execute({
      bookingId,
      initiator: body.initiator,
      reason: body.reason as CancellationReason,
      description: body.description,
    });

    return { status: 'CANCELLED' };
  }
}
