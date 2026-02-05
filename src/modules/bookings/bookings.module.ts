import { PAYMENT_REPOSITORY } from '../payments/repositories/payment.repository.token';
import { forwardRef } from '@nestjs/common';
import { VenuesModule } from '../venues/venues.module';
import { PromotersModule } from '../promoter/promoter.module';
import { ArtistsModule } from '../artists/artists.module';
import { PaymentsModule } from '../payments/payments.module';
import { DbPaymentRepository } from '../../infrastructure/database/repositories/payment.repository';
// src/modules/bookings/bookings.module.ts

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BookingsController } from './controllers/bookings.controller';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/bookings/SupabaseBookingRepository ';
import { BOOKING_REPOSITORY } from './repositories/booking-repository.token';
import { BookingService } from './service/booking.service';
import { CancelBookingUseCase } from './cancellations/use-cases/cancel-booking.use-case';
import { CANCELLATION_REPOSITORY } from './cancellations/cancellation.repository.token';
import { CancellationRepository } from 'src/infrastructure/database/repositories/cancellation.repository';
import { DbCancellationRepository } from 'src/infrastructure/database/repositories/db-cancellation.repository';
import { SupabaseModule } from 'src/infrastructure/database/supabase.module';
import { LoadBookingMiddleware } from '../events/middleware/load-booking.middleware';
import { SendNegotiationMessageUseCase } from './use-cases/negotiations/send-negotiation-message.use-case';
import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { GetNegotiationMessagesQuery } from './negotiations/quieries/get-negotiation-messages.query';
import { SendFinalOfferUseCase } from './use-cases/negotiations/send-final-offer.use-case';
import { ManagersModule } from '../managers/managers.module';
import { ContractsModule } from '../contracts/contracts.module';
import { AcceptFinalOfferUseCase } from './use-cases/negotiations/accept-final-offer.use-case';
import { RejectFinalOfferUseCase } from './use-cases/negotiations/reject-final-offer.use-case';
import { RejectBookingUseCase } from './use-cases/negotiations/reject-booking.use-case';
import { ContractRepository } from '@/src/infrastructure/database/repositories/contract.repository';
import { SignContractUseCase } from '../contracts/use-cases/sign-contract.use-case';
import { AcceptBookingUseCase } from './use-cases/confirm/confirm-booking.use-case';
import { CancellationsController } from './cancellations/controllers/cancellations.controller';
import { CreateCancellationCaseUseCase } from './cancellations/use-cases/create-cancellation-case.usecase';
import { DbCancellationCaseRepository } from '../../infrastructure/database/repositories/bookings/cancellation/db-cancellation-case.repository';
import { RequestBookingCancellationUseCase } from './cancellations/use-cases/request-booking-cancellation.usecase';
import { ResolveCancellationCaseUseCase } from './cancellations/resolutions/use-cases/resolve-cancellation-case.usecase';
import { CancellationResolutionsController } from './cancellations/resolutions/controllers/cancellation-resolutions.controller';
import { DbCancellationResolutionRepository } from '@/src/infrastructure/database/repositories/bookings/cancellation/db-cancellation-resolution.repository';
import { DbCancellationEconomicExecutionRepository } from '@/src/infrastructure/database/repositories/bookings/cancellation/db-cancellation-economic-execution.repository';
import { CANCELLATION_CASE_REPOSITORY } from './cancellations/repositories/cancellation-case.repository.token';
import { CANCELLATION_RESOLUTION_REPOSITORY } from './cancellations/resolutions/repositories/cancellation-resolution.repository.token';
import { CANCELLATION_ECONOMIC_EXECUTION_REPOSITORY } from './cancellations/economic-executions/repositories/cancellation-economic-execution.repository.token';
import { ExecuteCancellationEconomicImpactUseCase } from './cancellations/economic-executions/use-cases/execute-cancellation-economic-impact.usecase';
import { ConfirmPaymentMilestoneUseCase } from './use-cases/confirm/confirm-payment-milestone.usecase';
import { PAYMENT_MILESTONE_REPOSITORY } from '../payments/payment-milestone-repository.token';
import { DbPaymentMilestoneRepository } from '@/src/infrastructure/database/repositories/db-payment-milestone.repository';
import { ArtistCalendarBlockRepository } from '@/src/infrastructure/database/repositories/artist/artist-calendar-block.repository';
import { OutboxModule } from '../outbox/outbox.module';
import { EVENT_INVITATION_REPOSITORY } from '../events/repositories/event-invitation.repository.token';
import { SupabaseEventInvitationRepository } from '@/src/infrastructure/database/repositories/event/event-invitation.supabase.repository';
import { EVENT_REPOSITORY } from '../events/repositories/event.repository.token';
import { SupabaseEventRepository } from '@/src/infrastructure/database/repositories/event/event.supabase.repository';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/src/infrastructure/database/supabase.client';
import { GetPaymentMilestonesForBookingQuery } from '../payments/queries/get-payment-milestones-for-booking.query';
import { UserContextModule } from '../auth/user-context/user-context.module';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '../managers/repositories/artist-manager-representation.repository.token';
import { DbArtistManagerRepresentationRepository } from '@/src/infrastructure/database/repositories/manager/artist-manager-representation.repository';
import { MANAGER_REPOSITORY } from '../managers/repositories/manager-repository.token';
import { DbManagerRepository } from '@/src/infrastructure/database/repositories/manager/db-manager.repository';




@Module({
  imports: [SupabaseModule, OutboxModule, forwardRef(() => ManagersModule), ContractsModule, forwardRef(() => PaymentsModule), forwardRef(() => ArtistsModule), VenuesModule, forwardRef(() => PromotersModule), forwardRef(() => UserContextModule)],
  controllers: [BookingsController, CancellationsController, CancellationResolutionsController],
  providers: [
    BookingService,
    CancelBookingUseCase,
    SendNegotiationMessageUseCase,
    NegotiationMessageRepository,
    GetNegotiationMessagesQuery,
    SendFinalOfferUseCase,
    RejectFinalOfferUseCase,
    AcceptFinalOfferUseCase,
    RejectBookingUseCase,
    ContractRepository,
    SignContractUseCase,
    AcceptBookingUseCase,
    CreateCancellationCaseUseCase,
    RequestBookingCancellationUseCase,
    ResolveCancellationCaseUseCase,
    ExecuteCancellationEconomicImpactUseCase,
    ConfirmPaymentMilestoneUseCase,
    GetPaymentMilestonesForBookingQuery,
    ArtistCalendarBlockRepository,
    ArtistNotificationRepository,
    {
      provide: ARTIST_MANAGER_REPRESENTATION_REPOSITORY,
      useClass: DbArtistManagerRepresentationRepository,
    },
    {
      provide: MANAGER_REPOSITORY,
      useClass: DbManagerRepository,
    },
    {
      provide: SupabaseClient,
      useValue: supabase,
    },
    {
      provide: EVENT_INVITATION_REPOSITORY,
      useClass: SupabaseEventInvitationRepository,
    },
    {
      provide: EVENT_REPOSITORY,
      useClass: SupabaseEventRepository,
    },
    {
      provide: CANCELLATION_ECONOMIC_EXECUTION_REPOSITORY,
      useClass: DbCancellationEconomicExecutionRepository,
    },
    {
      provide: CANCELLATION_RESOLUTION_REPOSITORY,
      useClass: DbCancellationResolutionRepository,
    },
    {
      provide: CANCELLATION_CASE_REPOSITORY,
      useClass: DbCancellationCaseRepository,
    },
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
    {
      provide: CANCELLATION_REPOSITORY,
      useClass: DbCancellationRepository,
    }
    ,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: DbPaymentRepository,
    },
    {
      provide: PAYMENT_MILESTONE_REPOSITORY,
      useClass: DbPaymentMilestoneRepository,
    },
  ],
  exports: [BookingService, BOOKING_REPOSITORY, NegotiationMessageRepository, CANCELLATION_ECONOMIC_EXECUTION_REPOSITORY],
})
export class BookingsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoadBookingMiddleware)
      .forRoutes(
        'bookings/:id',
        'bookings/:id/cancel',
        'bookings/:id/negotiations/messages',
        'bookings/:id/negotiations/reject',
        'bookings/:id/final-offer/accept',
        'bookings/:id/final-offer/reject',
        'bookings/:id/contract',
        'bookings/:id/contract/sign',
        'bookings/:id/accept'
      );
  }
}
