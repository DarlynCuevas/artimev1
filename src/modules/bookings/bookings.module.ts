// src/modules/bookings/bookings.module.ts

import { Module } from '@nestjs/common';
import { BookingsController } from './controllers/bookings.controller';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/SupabaseBookingRepository ';
import { BOOKING_REPOSITORY } from './repositories/booking-repository.token';
import { BookingService } from './service/booking.service';
import { CancelBookingUseCase } from './cancellations/use-cases/cancel-booking.use-case';
import { CANCELLATION_REPOSITORY } from './cancellations/cancellation.repository.token';
import { CancellationRepository } from 'src/infrastructure/database/repositories/cancellation.repository';
import { DbCancellationRepository } from 'src/infrastructure/database/repositories/db-cancellation.repository';
import { SupabaseModule } from 'src/infrastructure/database/supabase.module';
@Module({
  imports: [SupabaseModule],
  controllers: [BookingsController],
  providers: [
    BookingService,
    CancelBookingUseCase,
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
    {
      provide: CANCELLATION_REPOSITORY,
      useClass: DbCancellationRepository,
    }
  ],
  exports: [BookingService],
})
export class BookingsModule {}
