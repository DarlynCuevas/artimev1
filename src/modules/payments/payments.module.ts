import { PAYMENT_MILESTONE_REPOSITORY } from './payment-milestone-repository.token';
import { DbPaymentMilestoneRepository } from '../../infrastructure/database/repositories/db-payment-milestone.repository';
import { StripeOnboardingController } from './controllers/stripe-onboarding.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { CreateStripeAccountUseCase } from './use-cases/stripe/create-stripe-account.use-case';
import { StripeConnectService } from '../../infrastructure/payments/stripe-connect.service';
import { StripeWebhookService } from '../../infrastructure/payments/stripe-webhook.service';
import { ARTIST_REPOSITORY } from '../artists/repositories/artist-repository.token';
import { DbArtistRepository } from '../../infrastructure/database/repositories/artist.repository';
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';

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
  controllers: [StripeOnboardingController, StripeWebhookController, PaymentsController],
  providers: [
    ExecutePayoutUseCase,
    CreateStripeAccountUseCase,
    StripeConnectService,
    StripeWebhookService,
    // Add the use case as provider
    require('./use-cases/payment-intents/create-payment-intent-for-milestone.use-case').CreatePaymentIntentForMilestoneUseCase,
    {
      provide: ARTIST_REPOSITORY,
      useClass: DbArtistRepository,
    },
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
    {
      provide: PAYMENT_MILESTONE_REPOSITORY,
      useClass: DbPaymentMilestoneRepository,
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
