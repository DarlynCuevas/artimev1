import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BookingRepository } from '../../../infrastructure/database/repositories/booking.repository';
import { BookingResponseDto } from '../dto/booking-response.dto';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingRepository: BookingRepository,
  ) {}

  @Get(':id')
  async getById(@Param('id') id: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      id: booking.id,
      artistId: booking.artistId,
      venueId: booking.venueId ?? '',
      promoterId: booking.promoterId ?? null,
      status: booking.status,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
    };
  }
}
