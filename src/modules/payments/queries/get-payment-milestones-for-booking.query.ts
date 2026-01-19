import { Inject, Injectable } from '@nestjs/common';

import { PAYMENT_REPOSITORY } from '../repositories/payment.repository.token';
import type { PaymentRepository } from '../repositories/payment.repository.interface';


@Injectable()
export class GetPaymentMilestonesForBookingQuery {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute(input: { bookingId: string }) {
    const schedule =
      await this.paymentRepository.findScheduleByBookingId(input.bookingId);

    if (!schedule) {
      return [];
    }

    return this.paymentRepository.findMilestonesByScheduleId(schedule.id);
  }
}
