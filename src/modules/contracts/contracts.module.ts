import { Module, forwardRef } from '@nestjs/common';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { ContractRepository } from '../../infrastructure/database/repositories/contract.repository';
import { GenerateContractOnAcceptedUseCase } from './use-cases/generate-contract-on-accepted.usecase';
import { SignContractUseCase } from './use-cases/sign-contract.use-case';
import { BookingsModule } from '../bookings/bookings.module';
import { GenerateContractUseCase } from './use-cases/generate-contract.use-case';
import { BOOKING_REPOSITORY } from '../bookings/repositories/booking-repository.token';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/bookings/SupabaseBookingRepository';
import { GetContractByBookingUseCase } from './use-cases/get-contract-by-booking.use-case';

import { ContractsController } from './controllers/contracts.controller';
import { CreatePaymentScheduleForBookingUseCase } from '../payments/use-cases/create-payment-schedule-for-booking.usecase';
import { ArtistsModule } from '../artists/artists.module';
import { VenuesModule } from '../venues/venues.module';
import { UserContextModule } from '../auth/user-context/user-context.module';
import { PromotersModule } from '../promoter/promoter.module';
import { ManagersModule } from '../managers/managers.module';
import { ContractTemplateMapper } from './mappers/contract-template.mapper';
import { ContractPdfService } from './services/contract-pdf.service';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';

@Module({
  imports: [
    SupabaseModule,
    forwardRef(() => BookingsModule),
    forwardRef(() => require('../payments/payments.module').PaymentsModule),
    forwardRef(() => ArtistsModule),
    forwardRef(() => VenuesModule),
    PromotersModule,
    forwardRef(() => ManagersModule),
    UserContextModule,
  ],
  controllers: [ContractsController],
  providers: [
    ContractRepository,
    ContractTemplateMapper,
    ContractPdfService,
    ArtistNotificationRepository,
    GenerateContractOnAcceptedUseCase,
    SignContractUseCase,
    GenerateContractUseCase,
    GetContractByBookingUseCase,
    CreatePaymentScheduleForBookingUseCase,
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
  ],
  exports: [
    GenerateContractOnAcceptedUseCase,
    SignContractUseCase,
    GenerateContractUseCase,
    ContractPdfService,
    BOOKING_REPOSITORY,
    CreatePaymentScheduleForBookingUseCase,
  ],
})
export class ContractsModule {}
