import { Controller, Get, Param, NotFoundException, Post, Req, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/boobking/SupabaseBookingRepository ';
import { BookingResponseDto } from '../dto/booking-response.dto';
import { BookingService } from '../service/booking.service';
import type { AuthenticatedRequest } from 'src/shared/authenticated-request';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { CancellationInitiator } from '../cancellations/cancellation-initiator.enum';
import { CancelBookingUseCase } from '../cancellations/use-cases/cancel-booking.use-case';
import { SendNegotiationMessageUseCase } from '../use-cases/negotiations/send-negotiation-message.use-case';
import { NegotiationSenderRole } from '../negotiations/negotiation-message.entity';
import { GetNegotiationMessagesQuery } from '../negotiations/quieries/get-negotiation-messages.query';
import { SendFinalOfferUseCase } from '../use-cases/negotiations/send-final-offer.use-case';
import { AcceptFinalOfferUseCase } from '../use-cases/negotiations/accept-final-offer.use-case';
import { RejectFinalOfferUseCase } from '../use-cases/negotiations/reject-final-offer.use-case';
import { AcceptBookingUseCase } from '../use-cases/negotiations/accept-booking.use-case';
import { RejectBookingUseCase } from '../use-cases/negotiations/reject-booking.use-case';



@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
    private readonly sendNegotiationMessageUseCase: SendNegotiationMessageUseCase,
    private readonly getNegotiationMessagesQuery: GetNegotiationMessagesQuery,
    private readonly sendFinalOfferUseCase: SendFinalOfferUseCase,
    private readonly acceptFinalOfferUseCase: AcceptFinalOfferUseCase,
    private readonly rejectFinalOfferUseCase: RejectFinalOfferUseCase,
    private readonly acceptBookingUseCase: AcceptBookingUseCase,
    private readonly rejectBookingUseCase: RejectBookingUseCase,
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

    // Obtener cantidad de mensajes de negociación
    const messages = await this.getNegotiationMessagesQuery.execute(id);
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    return {
      id: booking.id,
      artistId: booking.artistId,
      venueId: booking.venueId ?? '',
      promoterId: booking.promoterId ?? null,
      status: booking.status,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
      start_date: booking.start_date,
      messagesCount: messages.length,
      lastMessage: lastMessage
        ? {
          senderRole: lastMessage.senderRole,
          senderUserId: lastMessage.senderUserId,
        }
        : null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyBookings(
    @Req() req: AuthenticatedRequest,
  ): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingService.getForUser(req.user.sub, req.user.role);

    // Para mínimo viable, devolvemos messagesCount: 0 (sin consulta extra)
    return bookings.map((booking) => ({
      id: booking.id,
      artistId: booking.artistId,
      venueId: booking.venueId ?? '',
      promoterId: booking.promoterId ?? null,
      status: booking.status,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
      start_date: booking.start_date,
      messagesCount: 0,
      lastMessage: null,
    }));
  }



  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    if (req.user.role !== 'VENUE' && req.user.role !== 'PROMOTER') {
      throw new ForbiddenException(
        'Only venues or promoters can create bookings',
      );
    }
    const booking = await this.bookingService.createBooking({
      artistId: dto.artistId,
      venueId: req.user.sub,
      eventId: dto.eventId,
      currency: dto.currency,
      totalAmount: dto.totalAmount,
      start_date: dto.start_date,
      role: req.user.role,
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
      messagesCount: 0,
      lastMessage: null,
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

  //NEGOCIATIONS

  @UseGuards(JwtAuthGuard)
  @Post(':id/negotiations/messages')
  async sendNegotiationMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') bookingId: string,
    @Body() body: { message: string; proposedFee?: number },
  ) {
    const senderRole = req.user.role as NegotiationSenderRole;

    await this.sendNegotiationMessageUseCase.execute({
      bookingId,
      senderUserId: req.user.sub,
      senderRole,
      message: body.message,
      proposedFee: body.proposedFee,
    });

    return { ok: true };
  }
  //Get negotiation query messages
  @UseGuards(JwtAuthGuard)
  @Get(':id/negotiations/messages')
  async getNegotiationMessages(
    @Param('id') bookingId: string,
  ) {
    const messages = await this.getNegotiationMessagesQuery.execute(bookingId);
    return messages.map((m) => ({
      id: m.id,
      bookingId: m.bookingId,
      senderRole: m.senderRole,
      senderUserId: m.senderUserId,
      message: m.message,
      proposedFee: m.proposedFee,
      isFinalOffer: m.isFinalOffer,
      createdAt: m.createdAt,
    }));
  }

  //aceptar oferta
  @UseGuards(JwtAuthGuard)
  @Post(':id/accept')
  async acceptBooking(
    @Param('id') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.acceptBookingUseCase.execute({
      bookingId,
      senderUserId: req.user.sub,
    });
  }

  //rechazar oferta 
  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  async rejectBooking(
    @Param('id') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.rejectBookingUseCase.execute({
      bookingId,
      senderUserId: req.user.sub,
    });
  }


  //Final offert bookings
  @UseGuards(JwtAuthGuard)
  @Post(':id/negotiations/final-offer')
  async sendFinalOffer(
    @Req() req: AuthenticatedRequest,
    @Param('id') bookingId: string,
    @Body()
    body: {
      proposedFee: number;
      message?: string;
    },
  ) {
    await this.sendFinalOfferUseCase.execute({
      bookingId,
      senderRole: req.user.role as NegotiationSenderRole,
      senderUserId: req.user.sub,
      proposedFee: body.proposedFee,
      message: body.message,
    });

    return { success: true };
  }



}
