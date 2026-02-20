import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CreatePaymentIntentForMilestoneUseCase } from '../use-cases/payment-intents/create-payment-intent-for-milestone.use-case';
import { CreatePaymentScheduleForBookingUseCase } from '../use-cases/create-payment-schedule-for-booking.usecase';
import { GetPaymentMilestonesForBookingQuery } from '../queries/get-payment-milestones-for-booking.query';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

//@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createPaymentIntentForMilestoneUseCase: CreatePaymentIntentForMilestoneUseCase,
    private readonly createPaymentScheduleForBookingUseCase: CreatePaymentScheduleForBookingUseCase,
    private readonly getPaymentMilestonesForBookingQuery: GetPaymentMilestonesForBookingQuery,
  ) {}

  // EXISTENTE (NO SE TOCA)
  @Post('create-payment-intent/:milestoneId')
  async createPaymentIntentForTest(
    @Param('milestoneId') milestoneId: string,
  ): Promise<any> {
    // ...existing code...
    const secret = await this.createPaymentIntentForMilestoneUseCase.execute({
      paymentMilestoneId: milestoneId,
    });
    // ...existing code...
    return secret;
  }

  // NUEVO — crear schedule + milestone
  @Post('bookings/:bookingId/schedule')
  async createScheduleForBooking(
    @Param('bookingId') bookingId: string,
  ) {
    // ...existing code...
    const result = await this.createPaymentScheduleForBookingUseCase.execute({
      bookingId,
    });
    // ...existing code...
    return result;
  }

  // NUEVO — listar milestones
  @Get('bookings/:bookingId/milestones')
  async getMilestonesForBooking(
    @Param('bookingId') bookingId: string,
  ) {
    // ...existing code...
    const result = await this.getPaymentMilestonesForBookingQuery.execute({
      bookingId,
    });
    // ...existing code...
    return result;
  }
}
