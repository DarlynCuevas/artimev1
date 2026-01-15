import { Controller, Get, Param, NotFoundException, Post, Req, Body, UseGuards } from '@nestjs/common';
import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/SupabaseBookingRepository ';
import { BookingResponseDto } from '../dto/booking-response.dto';
import { BookingService } from '../service/booking.service';
import type { AuthenticatedRequest } from 'src/shared/authenticated-request';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { CancellationInitiator } from '../cancellations/cancellation-initiator.enum';
import { CancelBookingUseCase } from '../cancellations/use-cases/cancel-booking.use-case';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingService: BookingService,private readonly cancelBookingUseCase: CancelBookingUseCase,
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
      start_date: booking.start_date,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyBookings(
    @Req() req: AuthenticatedRequest,
  ): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingService.getForUser(req.user.sub, req.user.role);

    return bookings.map((booking) => ({
      id: booking.id,
      artistId: booking.artistId,
      venueId: booking.venueId ?? '',
      promoterId: booking.promoterId ?? null,
      status: booking.status,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
      start_date: booking.start_date,
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
      venueId: req.user.sub,
      eventId: dto.eventId,
      currency: dto.currency,
      totalAmount: dto.totalAmount,
      start_date: dto.start_date,
    });

    return {
      id: booking.id,
      artistId: booking.artistId,
      venueId: booking.venueId ?? '',
      promoterId: booking.promoterId ?? null,
      status: booking.status,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
      start_date: booking.start_date,
    };
  }

  //CANCELACIONES
  @UseGuards(JwtAuthGuard)
@Post(':id/cancel')
async cancelBooking(
  @Param('id') bookingId: string,
  @Body() body: CancelBookingDto,
  @Req() req: AuthenticatedRequest,
) {
  const user = req.user;

  let initiator: CancellationInitiator;

  switch (user.role) {
    case 'ARTIST':
      initiator = CancellationInitiator.ARTIST;
      break;
    case 'VENUE':
      initiator = CancellationInitiator.VENUE;
      break;
    case 'PROMOTER':
      initiator = CancellationInitiator.PROMOTER;
      break;
    default:
      initiator = CancellationInitiator.SYSTEM;
  } 

  return this.cancelBookingUseCase.execute({
    bookingId,
    initiator: CancellationInitiator[initiator],
    reason: body.reason,
    description: body.description,
  });
}

}
