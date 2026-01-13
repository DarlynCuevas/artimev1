// src/modules/bookings/bookings.module.ts

import { Module } from '@nestjs/common';
import { BookingsController } from './controllers/bookings.controller';
import {SupabaseBookingRepository } from '../../infrastructure/database/repositories/SupabaseBookingRepository ';
import { BOOKING_REPOSITORY } from './repositories/booking-repository.token';
import { BookingService } from './service/booking.service';

@Module({
  controllers: [BookingsController],
  providers: [
     BookingService,
    {
    provide: BOOKING_REPOSITORY,
    useClass: SupabaseBookingRepository,
  }
  ],
  exports: [BookingService],
})
export class BookingsModule {}
