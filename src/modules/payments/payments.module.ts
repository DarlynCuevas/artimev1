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
import { PayoutsController } from './payouts/controllers/payouts.controller';
import { CreatePayoutForBookingUseCase } from './use-cases/payouts/create-payout-for-booking.use-case';
import { SplitCalculator } from './split/split-calculator.service';


// Tokens
import { SPLIT_SUMMARY_REPOSITORY } from './split/split-summary.tokens';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

// Interfaces
import { BOOKING_REPOSITORY } from '../bookings/repositories/booking-repository.token';
import { PAYOUT_REPOSITORY } from './repositories/payout.repository.token';

// Implementations (infra)
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/SupabaseBookingRepository ';
import { DbSplitSummaryRepository } from '../../infrastructure/database/repositories/split-summary.repository';
import { StripePaymentProvider } from '../../infrastructure/payments/stripe-payment.provider';
import { DbPayoutRepository } from '../../infrastructure/database/db-payout-repository';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../infrastructure/database/supabase.client';
import { CANCELLATION_REPOSITORY } from './cancellations/cancellation.repository.token';
import { DbCancellationRepository } from 'src/infrastructure/database/repositories/db-cancellation.repository';
import { CancelBookingUseCase } from './cancellations/use-cases/cancel-booking.use-case';
import { CancellationsController } from './cancellations/controllers/cancellations.controller';
import { PayoutResponseMapper } from './payouts/mappers/payout-response.mapper';
import { PayoutsQueryService } from './payouts/queries/payouts-query.service';

import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [BookingsModule],
  controllers: [StripeOnboardingController, StripeWebhookController, PaymentsController, PayoutsController, CancellationsController],
  providers: [
    CreateStripeAccountUseCase,
    StripeConnectService,
    StripeWebhookService,
    PayoutsQueryService,
    PayoutResponseMapper,
    require('./use-cases/payment-intents/create-payment-intent-for-milestone.use-case').CreatePaymentIntentForMilestoneUseCase,
    {
      provide: ARTIST_REPOSITORY,
      useClass: DbArtistRepository,
    },
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
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
    {
      provide: SupabaseClient,
      useValue: supabase,
    },
    {
      provide: CANCELLATION_REPOSITORY,
      useClass: DbCancellationRepository,
    },
    // --- TEMPORAL para pruebas internas ---
    CreatePayoutForBookingUseCase,
    SplitCalculator,
    DbPayoutRepository,
    SupabaseBookingRepository,
    CancelBookingUseCase
  ],
  exports: [PAYOUT_REPOSITORY, BOOKING_REPOSITORY],
})
export class PaymentsModule {}
