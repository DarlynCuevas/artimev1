// src/modules/bookings/bookings.module.ts

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BookingsController } from './controllers/bookings.controller';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/boobking/SupabaseBookingRepository ';
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

@Module({
  imports: [SupabaseModule, ManagersModule, ContractsModule],
  controllers: [BookingsController, CancellationsController],
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
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
    {
      provide: CANCELLATION_REPOSITORY,
      useClass: DbCancellationRepository,
    }
  ],
  exports: [BookingService, BOOKING_REPOSITORY, NegotiationMessageRepository],
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
