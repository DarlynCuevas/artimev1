import { Module } from '@nestjs/common';

import { ExecutePayoutUseCase } from './use-cases/payouts/execute-payout.use-case';

// Tokens
import { SPLIT_SUMMARY_REPOSITORY } from './split/split-summary.tokens';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

// Interfaces
import { BOOKING_REPOSITORY } from '../bookings/repositories/booking-repository.token';
import { PAYOUT_REPOSITORY } from './use-cases/payouts/payout-repository.token';

// Implementations (infra)
import { BookingRepository } from '../../infrastructure/database/repositories/booking.repository';
import { DbSplitSummaryRepository } from '../../infrastructure/database/repositories/split-summary.repository';
import { DbPayoutRepository } from '../../infrastructure/database/repositories/db-payout.repository';
import { StripePaymentProvider } from '../../infrastructure/payments/stripe-payment.provider';

@Module({
  providers: [
    ExecutePayoutUseCase,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
    {
      provide: SPLIT_SUMMARY_REPOSITORY,
      useClass: DbSplitSummaryRepository,
    },
    {
      provide: PAYOUT_REPOSITORY,
      useClass: DbPayoutRepository,
    },
    {
      provide: PAYMENT_PROVIDER,
      useClass: StripePaymentProvider,
    },
  ],
  exports: [ExecutePayoutUseCase],
})
export class PaymentsModule {}
