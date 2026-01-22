import { Controller, Get, Param, NotFoundException, Post, Req, Body, UseGuards, ForbiddenException, Inject } from '@nestjs/common';
import { BookingResponseDto } from '../dto/booking-response.dto';
import { BookingService } from '../service/booking.service';
import type { AuthenticatedRequest } from 'src/shared/authenticated-request';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { CancellationInitiator } from '../cancellations/enums/cancellation-initiator.enum';
import { CancelBookingUseCase } from '../cancellations/use-cases/cancel-booking.use-case';
import { SendNegotiationMessageUseCase } from '../use-cases/negotiations/send-negotiation-message.use-case';
import { NegotiationSenderRole } from '../negotiations/negotiation-message.entity';
import { GetNegotiationMessagesQuery } from '../negotiations/quieries/get-negotiation-messages.query';
import { SendFinalOfferUseCase } from '../use-cases/negotiations/send-final-offer.use-case';
import { AcceptFinalOfferUseCase } from '../use-cases/negotiations/accept-final-offer.use-case';
import { RejectFinalOfferUseCase } from '../use-cases/negotiations/reject-final-offer.use-case';
import { RejectBookingUseCase } from '../use-cases/negotiations/reject-booking.use-case';
import { ContractRepository } from '@/src/infrastructure/database/repositories/contract.repository';
import { ContractResponseDto } from '../../contracts/dto/contract-response.dto';
import { BOOKING_REPOSITORY } from '../repositories/booking-repository.token';
import type { BookingRepository } from '../repositories/booking.repository.interface';
import { SignContractUseCase } from '../../contracts/use-cases/sign-contract.use-case';
import { AcceptBookingUseCase } from '../use-cases/confirm/confirm-booking.use-case';
import { ConfirmPaymentMilestoneUseCase } from '../use-cases/confirm/confirm-payment-milestone.usecase';
import { UserContextGuard } from '../../auth/user-context.guard';
import { VenuesService } from '../../venues/services/venues.service';



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
    private readonly rejectBookingUseCase: RejectBookingUseCase,
    private readonly acceptBookingUseCase: AcceptBookingUseCase,
    private readonly confirmPaymentMilestoneUseCase: ConfirmPaymentMilestoneUseCase,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: BookingRepository,
    private readonly contractRepository: ContractRepository,
    @Inject(SignContractUseCase) private readonly signContractUseCase: SignContractUseCase,
  ) { }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Get(':id')
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingService.getById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const { artistId, venueId, managerId } = req.userContext;

    const isAllowed =
      (artistId && booking.artistId === artistId) ||
      (venueId && booking.venueId === venueId) ||
      (managerId && booking.managerId === managerId);

    if (!isAllowed) {
      throw new ForbiddenException('You are not allowed to view this booking');
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
      managerId: booking.managerId ?? null,
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

  @UseGuards(JwtAuthGuard,UserContextGuard)
  @Get()
  async getMyBookings(
    @Req() req: AuthenticatedRequest,
  ): Promise<BookingResponseDto[]> {    
    const bookings = await this.bookingService.getForUser(req.userContext);

    // Para mínimo viable, devolvemos messagesCount: 0 (sin consulta extra)
    return bookings.map((booking) => ({
      id: booking.id,
      artistId: booking.artistId,
      venueId: booking.venueId ?? '',
      managerId: booking.managerId ?? null,
      promoterId: booking.promoterId ?? null,
      status: booking.status,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
      start_date: booking.start_date,
      messagesCount: 0,
      lastMessage: null,
    }));
  }



@UseGuards(JwtAuthGuard, UserContextGuard)
@Post()

async create(
  @Req() req: AuthenticatedRequest,
  @Body() dto: CreateBookingDto,
): Promise<BookingResponseDto> {
  // LOG: contexto de usuario completo
  const { venueId, userId } = req.userContext;
  // LOG: valores clave

  if (!venueId) {
    throw new ForbiddenException('Only venues can create bookings');
  }

  const booking = await this.bookingService.createBooking({
    artistId: dto.artistId,
    venueId,
    eventId: dto.eventId,
    currency: dto.currency,
    totalAmount: dto.totalAmount,
    start_date: dto.start_date,
    message: dto.message,
    senderRole: NegotiationSenderRole.VENUE,
    senderUserId: userId,
  });

  // LOG: booking creado
  console.log('Booking creado:', booking);

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
  @UseGuards(JwtAuthGuard, UserContextGuard)
@Post(':id/cancel')
async cancelBooking(
  @Param('id') bookingId: string,
  @Body() body: CancelBookingDto,
  @Req() req: AuthenticatedRequest,
) {
  const { venueId, artistId, managerId } = req.userContext;

  let initiator: CancellationInitiator;

  if (artistId) {
    initiator = CancellationInitiator.ARTIST;
  } else if (venueId) {
    initiator = CancellationInitiator.VENUE;
  } else if (managerId) {
    initiator = CancellationInitiator.MANAGER;
  } else {
    initiator = CancellationInitiator.SYSTEM;
  }

  return this.cancelBookingUseCase.execute({
    bookingId,
    initiator,
    reason: body.reason,
    description: body.description,
  });
}


  //NEGOCIATIONS

@UseGuards(JwtAuthGuard, UserContextGuard)
@Post(':id/negotiations/messages')
async sendNegotiationMessage(
  @Req() req: AuthenticatedRequest,
  @Param('id') bookingId: string,
  @Body() body: { message: string; proposedFee?: number },
) {
  const { userId, venueId, artistId, managerId } = req.userContext;

  let senderRole: NegotiationSenderRole;

  if (venueId) {
    senderRole = NegotiationSenderRole.VENUE;
  } else if (artistId) {
    senderRole = NegotiationSenderRole.ARTIST;
  } else if (managerId) {
    senderRole = NegotiationSenderRole.MANAGER;
  } else {
    throw new ForbiddenException();
  }

  await this.sendNegotiationMessageUseCase.execute({
    bookingId,
    senderUserId: userId,
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


  //rechazar oferta 
  @UseGuards(JwtAuthGuard)
  @Post(':id/negotiations/reject')
  async rejectBooking(
    @Param('id') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.rejectBookingUseCase.execute({
      bookingId,
      senderUserId: req.user.sub,
    });
  }

  //negotiation final offer
@UseGuards(JwtAuthGuard, UserContextGuard)
@Post(':id/negotiations/final-offer')
async sendFinalOffer(
  @Req() req: AuthenticatedRequest,
  @Param('id') bookingId: string,
  @Body() body: {
    proposedFee: number;
    message?: string;
  },
) {
  const { userId, venueId, artistId, managerId } = req.userContext;

  let senderRole: NegotiationSenderRole;

  if (venueId) {
    senderRole = NegotiationSenderRole.VENUE;
  } else if (artistId) {
    senderRole = NegotiationSenderRole.ARTIST;
  } else if (managerId) {
    senderRole = NegotiationSenderRole.MANAGER;
  } else {
    throw new ForbiddenException();
  }

  await this.sendFinalOfferUseCase.execute({
    bookingId,
    senderUserId: userId,
    senderRole,
    proposedFee: body.proposedFee,
    message: body.message,
  });

  return { ok: true };
}

  //Final offert bookings
@UseGuards(JwtAuthGuard, UserContextGuard)
@Post(':id/final-offer/accept')
async finalOfferAccept(
  @Req() req: AuthenticatedRequest,
  @Param('id') bookingId: string,
) {
  const { userId, venueId, artistId, managerId } = req.userContext;

  let senderRole: NegotiationSenderRole;

  if (artistId) {
    senderRole = NegotiationSenderRole.ARTIST;
  } else if (managerId) {
    senderRole = NegotiationSenderRole.MANAGER;
  } else if (venueId) {
    senderRole = NegotiationSenderRole.VENUE;
  } else {
    throw new ForbiddenException();
  }

  await this.acceptFinalOfferUseCase.execute({
    bookingId,
    senderRole,
    senderUserId: userId,
  });

  return { success: true };
}

//Rechazar offer
@UseGuards(JwtAuthGuard, UserContextGuard)
@Post(':id/final-offer/reject')
async finalOfferReject(
  @Req() req: AuthenticatedRequest,
  @Param('id') bookingId: string,
) {
  const { userId, venueId, artistId, managerId } = req.userContext;

  let senderRole: NegotiationSenderRole;

  if (artistId) {
    senderRole = NegotiationSenderRole.ARTIST;
  } else if (managerId) {
    senderRole = NegotiationSenderRole.MANAGER;
  } else if (venueId) {
    senderRole = NegotiationSenderRole.VENUE;
  } else {
    throw new ForbiddenException();
  }

  await this.rejectFinalOfferUseCase.execute({
    bookingId,
    senderRole,
    senderUserId: userId,
  });

  return { success: true };
}


  //CONTRATO 
  @UseGuards(JwtAuthGuard, UserContextGuard)
@Get(':id/contract')
async getContract(
  @Param('id') bookingId: string,
  @Req() req: AuthenticatedRequest,
): Promise<ContractResponseDto> {
  const booking = await this.bookingRepository.findById(bookingId);
  if (!booking) {
    throw new NotFoundException('Booking not found');
  }

  const { venueId, artistId, managerId } = req.userContext;

  const isAllowed =
    (artistId && booking.artistId === artistId) ||
    (managerId && booking.managerId === managerId) ||
    (venueId && booking.venueId === venueId);

  if (!isAllowed) {
    throw new ForbiddenException(
      'You are not allowed to view this contract',
    );
  }

  const contract =
    await this.contractRepository.findByBookingId(bookingId);

  if (!contract) {
    throw new NotFoundException('Contract not found');
  }

  return {
    id: contract.id,
    bookingId: contract.bookingId,
    version: contract.version,
    status: contract.status,
    currency: contract.currency,
    totalAmount: contract.totalAmount,
    artimeCommissionPercentage: contract.artimeCommissionPercentage,
    finalOfferId: contract.finalOfferId,
    signedAt: contract.signedAt,
    signedByRole: contract.signedByRole,
    snapshotData: contract.snapshotData,
    createdAt: contract.createdAt,
  };
}

@UseGuards(JwtAuthGuard, UserContextGuard)
@Post(':id/accept')
async acceptBooking(
  @Param('id') bookingId: string,
  @Req() req: AuthenticatedRequest,
) {
  const { userId, venueId, artistId, managerId } = req.userContext;

  let senderRole: NegotiationSenderRole;

  if (artistId) {
    senderRole = NegotiationSenderRole.ARTIST;
  } else if (managerId) {
    senderRole = NegotiationSenderRole.MANAGER;
  } else if (venueId) {
    senderRole = NegotiationSenderRole.VENUE;
  } else {
    throw new ForbiddenException();
  }

  await this.acceptBookingUseCase.execute({
    bookingId,
    senderUserId: userId,
    senderRole,
  });

  return { success: true };
}


@UseGuards(JwtAuthGuard, UserContextGuard)
@Post(':id/payments/confirm')
async confirmPayment(
  @Param('id') bookingId: string,
  @Body('milestoneId') milestoneId: string,
  @Req() req: AuthenticatedRequest,
) {
  const { userId, venueId, artistId, managerId } = req.userContext;

  // Solo quien participa en el booking puede confirmar pagos (v1: normalmente VENUE)
  if (!venueId && !artistId && !managerId) {
    throw new ForbiddenException();
  }

  await this.confirmPaymentMilestoneUseCase.execute({
    bookingId,
    milestoneId,
    executedByUserId: userId,
  });

  return { success: true };
}

}
