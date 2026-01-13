import { Controller, Get, Param, NotFoundException, Post, Req, Body, UseGuards } from '@nestjs/common';
import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/SupabaseBookingRepository ';
import { BookingResponseDto } from '../dto/booking-response.dto';
import { BookingService } from '../service/booking.service';
import type { AuthenticatedRequest } from 'src/shared/authenticated-request';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingService: BookingService
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingService.getById(id);

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

  @UseGuards(JwtAuthGuard)
@Get()
async getMyBookings(
  @Req() req: AuthenticatedRequest,
): Promise<BookingResponseDto[]> {
  const bookings = await this.bookingService.getForUser(req.user);

  return bookings.map((booking) => ({
    id: booking.id,
    artistId: booking.artistId,
    venueId: booking.venueId ?? '',
    promoterId: booking.promoterId ?? null,
    status: booking.status,
    currency: booking.currency,
    totalAmount: booking.totalAmount,
  }));
}



  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingService.createBooking({
      artistId: dto.artistId,
      venueId: req.user.id,
      eventId: dto.eventId,
      currency: dto.currency,
      totalAmount: dto.totalAmount,
    });

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
