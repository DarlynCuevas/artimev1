import { Controller, Post, Param } from '@nestjs/common';
import { CreatePaymentIntentForMilestoneUseCase } from './use-cases/payment-intents/create-payment-intent-for-milestone.use-case';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createPaymentIntentForMilestoneUseCase: CreatePaymentIntentForMilestoneUseCase,
  ) {}

  @Post('test/create-payment-intent/:milestoneId')
  async createPaymentIntentForTest(
    @Param('milestoneId') milestoneId: string,
  ): Promise<any> {
    return this.createPaymentIntentForMilestoneUseCase.execute({
      paymentMilestoneId: milestoneId,
    });
  }
}
