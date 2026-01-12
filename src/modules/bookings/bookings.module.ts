// src/modules/bookings/bookings.module.ts

import { Module } from '@nestjs/common';
import { BookingsController } from './controllers/bookings.controller';
import { BookingRepository } from '../../infrastructure/database/repositories/booking.repository';

@Module({
  controllers: [BookingsController],
  providers: [BookingRepository],
  exports: [BookingRepository],
})
export class BookingsModule {}
