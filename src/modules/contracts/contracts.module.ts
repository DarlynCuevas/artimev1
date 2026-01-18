import { Module, forwardRef } from '@nestjs/common';
import { ContractRepository } from '../../infrastructure/database/repositories/contract.repository';
import { GenerateContractOnAcceptedUseCase } from './use-cases/generate-contract-on-accepted.usecase';
import { SignContractUseCase } from './use-cases/sign-contract.use-case';
import { BookingsModule } from '../bookings/bookings.module';
import { GenerateContractUseCase } from './use-cases/generate-contract.use-case';
import { BOOKING_REPOSITORY } from '../bookings/repositories/booking-repository.token';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/bookings/SupabaseBookingRepository ';
import { GetContractByBookingUseCase } from './use-cases/get-contract-by-booking.use-case';

import { ContractsController } from './controllers/contracts.controller';

@Module({
  imports: [
    forwardRef(() => BookingsModule), 
  ],
  controllers: [ContractsController],
  providers: [
    ContractRepository,
    GenerateContractOnAcceptedUseCase,
    SignContractUseCase,
    GenerateContractUseCase,
    GetContractByBookingUseCase,
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
  ],
  exports: [
    GenerateContractOnAcceptedUseCase,
    SignContractUseCase,
    GenerateContractUseCase,
    BOOKING_REPOSITORY,
    
  ],
})
export class ContractsModule {}
