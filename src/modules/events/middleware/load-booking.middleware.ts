import { Inject, Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';

@Injectable()
export class LoadBookingMiddleware implements NestMiddleware {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      throw new NotFoundException('Invalid booking id');
    }

    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    (req as any).booking = booking;

    next();
  }
}
