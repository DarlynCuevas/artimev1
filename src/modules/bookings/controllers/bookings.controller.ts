import { Controller, Get, Param, NotFoundException, Post, Req, Body, UseGuards, ForbiddenException, Inject, BadRequestException } from '@nestjs/common';
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
import { GetPaymentMilestonesForBookingQuery } from '../../payments/queries/get-payment-milestones-for-booking.query';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '../../managers/repositories/artist-manager-representation.repository.token';
import type { ArtistManagerRepresentationRepository } from '../../managers/repositories/artist-manager-representation.repository.interface';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { PROMOTER_REPOSITORY } from '../../promoter/repositories/promoter-repository.token';
import type { PromoterRepository } from '../../promoter/repositories/promoter.repository.interface';
import { VENUE_REPOSITORY } from '../../venues/repositories/venue-repository.token';
import type { VenueRepository } from '../../venues/repositories/venue.repository.interface';
import { ARTIST_REPOSITORY } from '../../artists/repositories/artist-repository.token';
import type { ArtistRepository } from '../../artists/repositories/artist.repository.interface';
import { MANAGER_REPOSITORY } from '../../managers/repositories/manager-repository.token';
import type { ManagerRepository } from '../../managers/repositories/manager.repository.interface';



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
    private readonly getPaymentMilestonesForBookingQuery: GetPaymentMilestonesForBookingQuery,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly representationRepository: ArtistManagerRepresentationRepository,
    private readonly notificationRepository: ArtistNotificationRepository,
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
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

    const { artistId, venueId, managerId, promoterId } = req.userContext;

    let isAllowed =
      (artistId && booking.artistId === artistId) ||
      (venueId && booking.venueId === venueId) ||
      (managerId && booking.managerId === managerId) ||
      (promoterId && booking.promoterId === promoterId);

    if (!isAllowed && managerId) {
      const hasRepresentation = await this.representationRepository.existsActiveRepresentation({
        artistId: booking.artistId,
        managerId,
      });
      if (hasRepresentation) {
        isAllowed = true;
      } else {
        const latestRep = await this.representationRepository.findLatestVersionByArtist(booking.artistId);
        if (latestRep?.managerId === managerId) {
          isAllowed = true;
        }
      }
    }

    if (!isAllowed) {
      throw new ForbiddenException('You are not allowed to view this booking');
    }

    const messages = await this.getNegotiationMessagesQuery.execute(id);
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const firstArtistSideMessage = messages.find(
      (m) => m.senderRole === NegotiationSenderRole.ARTIST || m.senderRole === NegotiationSenderRole.MANAGER,
    ) ?? null;

    const artistSideOwnerUserId = firstArtistSideMessage?.senderUserId ?? booking.actorUserId ?? null;
    const artistSideOwnerRole = firstArtistSideMessage?.senderRole ?? null;
    const artistSideOwnedByMe = artistSideOwnerUserId
      ? artistSideOwnerUserId === req.userContext.userId
      : false;
    const milestones = await this.getPaymentMilestonesForBookingQuery.execute({
      bookingId: booking.id,
    });
    const paidAmount = milestones
      .filter((m: any) => m.status === 'PAID' || m.status === 'FINALIZED')
      .reduce((sum: number, m: any) => sum + (m.amount ?? 0), 0);
    const paidPercent =
      booking.totalAmount && booking.totalAmount > 0
        ? Math.round((paidAmount / booking.totalAmount) * 100)
        : null;

    return {
      id: booking.id,
      artistId: booking.artistId,
      artistName: (booking as any).artistName ?? null,
      artistCity: (booking as any).artistCity ?? null,
      venueId: booking.venueId ?? '',
      venueName: (booking as any).venueName ?? null,
      venueCity: (booking as any).venueCity ?? null,
      promoterId: booking.promoterId ?? null,
      eventId: booking.eventId ?? null,
      eventName: (booking as any).eventName ?? null,
      status: booking.status,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
      paidPercent,
      managerId: booking.managerId ?? null,
      start_date: booking.start_date,
      handledAt: booking.handledAt ? booking.handledAt.toISOString() : null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: (booking as any).updatedAt ? (booking as any).updatedAt.toISOString() : null,
      actorUserId: booking.actorUserId ?? null,
      artistSideOwnerUserId,
      artistSideOwnerRole,
      artistSideOwnedByMe,
      messagesCount: messages.length,
      lastMessage: lastMessage
        ? {
          senderRole: lastMessage.senderRole,
          senderUserId: lastMessage.senderUserId,
        }
        : null,
    };
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Get()
  async getMyBookings(
    @Req() req: AuthenticatedRequest,
  ): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingService.getForUser(req.userContext);

    const rows = await Promise.all(
      bookings.map(async (booking) => {
        const milestones = await this.getPaymentMilestonesForBookingQuery.execute({
          bookingId: booking.id,
        });
        const paidAmount = milestones
          .filter((m: any) => m.status === 'PAID' || m.status === 'FINALIZED')
          .reduce((sum: number, m: any) => sum + (m.amount ?? 0), 0);
        const paidPercent =
          booking.totalAmount && booking.totalAmount > 0
            ? Math.round((paidAmount / booking.totalAmount) * 100)
            : null;

        return {
          id: booking.id,
          artistId: booking.artistId,
          artistName: (booking as any).artistName ?? null,
          artistCity: (booking as any).artistCity ?? null,
          venueId: booking.venueId ?? '',
          venueName: (booking as any).venueName ?? null,
          venueCity: (booking as any).venueCity ?? null,
          managerId: booking.managerId ?? null,
          promoterId: booking.promoterId ?? null,
          eventId: booking.eventId ?? null,
          eventName: (booking as any).eventName ?? null,
          status: booking.status,
          currency: booking.currency,
          totalAmount: booking.totalAmount,
          paidPercent,
          start_date: booking.start_date,
          handledAt: booking.handledAt ? booking.handledAt.toISOString() : null,
          createdAt: booking.createdAt.toISOString(),
          updatedAt: (booking as any).updatedAt ? (booking as any).updatedAt.toISOString() : null,
          actorUserId: booking.actorUserId ?? null,
          artistSideOwnerUserId: null,
          artistSideOwnerRole: null,
          artistSideOwnedByMe: false,
          messagesCount: 0,
          lastMessage: null,
        };
      }),
    );

    return rows;
  }



@UseGuards(JwtAuthGuard, UserContextGuard)
@Post()
async create(
  @Req() req: AuthenticatedRequest,
  @Body() dto: CreateBookingDto,
): Promise<BookingResponseDto> {
  console.log('[BookingsController.create] payload:', {
    artistId: dto.artistId,
    eventId: dto.eventId,
    start_date: dto.start_date,
    totalAmount: dto.totalAmount,
    currency: dto.currency,
  });
  // LOG: contexto de usuario completo
  const { venueId, promoterId, userId } = req.userContext;
  // LOG: valores clave

  if (!venueId && !promoterId) {
    throw new ForbiddenException('Only venues or promoters can create bookings');
  }

  if (!dto.eventId) {
    if (!dto.currency || dto.totalAmount === undefined || !dto.start_date) {
      throw new BadRequestException('MISSING_BOOKING_FIELDS');
    }
  }

  const booking = await this.bookingService.createBooking({
    artistId: dto.artistId,
    venueId: venueId ?? undefined,
    promoterId: promoterId ?? undefined,
    eventId: dto.eventId,
    currency: dto.currency,
    totalAmount: dto.totalAmount,
    start_date: dto.start_date,
    message: dto.message,
    senderRole: promoterId
      ? NegotiationSenderRole.PROMOTER
      : NegotiationSenderRole.VENUE,
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
      actorUserId: booking.actorUserId ?? null,
      artistSideOwnerUserId: null,
      artistSideOwnerRole: null,
      artistSideOwnedByMe: false,
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
    const { venueId, artistId, managerId, promoterId } = req.userContext;

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    let initiator: CancellationInitiator;

    if (artistId) {
      initiator = CancellationInitiator.ARTIST;
    } else if (managerId) {
      const represents = await this.representationRepository.existsActiveRepresentation({
        artistId: booking.artistId,
        managerId,
      });
      if (!represents) throw new ForbiddenException();
      initiator = CancellationInitiator.MANAGER;
    } else if (venueId) {
      initiator = CancellationInitiator.VENUE;
    } else if (promoterId) {
      initiator = CancellationInitiator.PROMOTER;
    } else {
      initiator = CancellationInitiator.SYSTEM;
    }

    const result = await this.cancelBookingUseCase.execute({
      bookingId,
      initiator,
      reason: body.reason,
      description: body.description,
    });

    let senderRole: NegotiationSenderRole | null = null;
    switch (initiator) {
      case CancellationInitiator.ARTIST:
        senderRole = NegotiationSenderRole.ARTIST;
        break;
      case CancellationInitiator.MANAGER:
        senderRole = NegotiationSenderRole.MANAGER;
        break;
      case CancellationInitiator.VENUE:
        senderRole = NegotiationSenderRole.VENUE;
        break;
      case CancellationInitiator.PROMOTER:
        senderRole = NegotiationSenderRole.PROMOTER;
        break;
      default:
        senderRole = null;
    }

    if (senderRole) {
      await this.notifyCounterparty({ booking, senderRole, action: 'BOOKING_CANCELLED' });
    }

    return result;
  }

  // NEGOTIATIONS
  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Post(':id/negotiations/messages')
  async sendNegotiationMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') bookingId: string,
    @Body() body: { message: string; proposedFee?: number },
  ) {
    const { userId, venueId, artistId, managerId, promoterId } = req.userContext;

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    let senderRole: NegotiationSenderRole;

    if (venueId && booking.venueId === venueId) {
      senderRole = NegotiationSenderRole.VENUE;
    } else if (promoterId && booking.promoterId === promoterId) {
      senderRole = NegotiationSenderRole.PROMOTER;
    } else if (artistId && booking.artistId === artistId) {
      senderRole = NegotiationSenderRole.ARTIST;
    } else if (managerId) {
      const represents = await this.representationRepository.existsActiveRepresentation({
        artistId: booking.artistId,
        managerId,
      });
      if (!represents) throw new ForbiddenException();
      senderRole = NegotiationSenderRole.MANAGER;
    } else {
      throw new ForbiddenException();
    }

    await this.sendNegotiationMessageUseCase.execute({
      bookingId,
      senderUserId: userId,
      senderManagerId: managerId,
      senderRole,
      message: body.message,
      proposedFee: body.proposedFee,
    });

    await this.notifyCounterparty({ booking, senderRole, action: 'NEGOTIATION_MESSAGE' });

    return { ok: true };
  }

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

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Post(':id/negotiations/reject')
  async rejectBooking(
    @Param('id') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, venueId, artistId, managerId, promoterId } = req.userContext;

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    let senderRole: NegotiationSenderRole;

    if (venueId && booking.venueId === venueId) {
      senderRole = NegotiationSenderRole.VENUE;
    } else if (promoterId && booking.promoterId === promoterId) {
      senderRole = NegotiationSenderRole.PROMOTER;
    } else if (artistId && booking.artistId === artistId) {
      senderRole = NegotiationSenderRole.ARTIST;
    } else if (managerId) {
      const represents = await this.representationRepository.existsActiveRepresentation({
        artistId: booking.artistId,
        managerId,
      });
      if (!represents) throw new ForbiddenException();
      senderRole = NegotiationSenderRole.MANAGER;
    } else {
      throw new ForbiddenException();
    }

    await this.rejectBookingUseCase.execute({
      bookingId,
      senderUserId: userId,
      senderRole,
    });

    await this.notifyCounterparty({ booking, senderRole, action: 'BOOKING_REJECTED' });
  }

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
    const { userId, venueId, artistId, managerId, promoterId } = req.userContext;

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    let senderRole: NegotiationSenderRole;

    if (venueId && booking.venueId === venueId) {
      senderRole = NegotiationSenderRole.VENUE;
    } else if (promoterId && booking.promoterId === promoterId) {
      senderRole = NegotiationSenderRole.PROMOTER;
    } else if (artistId && booking.artistId === artistId) {
      senderRole = NegotiationSenderRole.ARTIST;
    } else if (managerId) {
      const represents = await this.representationRepository.existsActiveRepresentation({
        artistId: booking.artistId,
        managerId,
      });
      if (!represents) throw new ForbiddenException();
      senderRole = NegotiationSenderRole.MANAGER;
    } else {
      throw new ForbiddenException();
    }

    await this.sendFinalOfferUseCase.execute({
      bookingId,
      senderUserId: userId,
      senderManagerId: managerId,
      senderRole,
      proposedFee: body.proposedFee,
      message: body.message,
    });

    await this.notifyCounterparty({ booking, senderRole, action: 'FINAL_OFFER_SENT' });

    return { ok: true };
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Post(':id/final-offer/accept')
  async finalOfferAccept(
    @Req() req: AuthenticatedRequest,
    @Param('id') bookingId: string,
  ) {
    const { userId, venueId, artistId, managerId, promoterId } = req.userContext;

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    let senderRole: NegotiationSenderRole;

    if (artistId && booking.artistId === artistId) {
      senderRole = NegotiationSenderRole.ARTIST;
    } else if (managerId) {
      const represents = await this.representationRepository.existsActiveRepresentation({
        artistId: booking.artistId,
        managerId,
      });
      if (!represents) throw new ForbiddenException();
      senderRole = NegotiationSenderRole.MANAGER;
    } else if (venueId && booking.venueId === venueId) {
      senderRole = NegotiationSenderRole.VENUE;
    } else if (promoterId && booking.promoterId === promoterId) {
      senderRole = NegotiationSenderRole.PROMOTER;
    } else {
      throw new ForbiddenException();
    }

    await this.acceptFinalOfferUseCase.execute({
      bookingId,
      senderRole,
      senderUserId: userId,
      senderManagerId: managerId,
    });

    await this.notifyCounterparty({ booking, senderRole, action: 'FINAL_OFFER_ACCEPTED' });

    return { success: true };
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Post(':id/final-offer/reject')
  async finalOfferReject(
    @Req() req: AuthenticatedRequest,
    @Param('id') bookingId: string,
  ) {
    const { userId, venueId, artistId, managerId, promoterId } = req.userContext;

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    let senderRole: NegotiationSenderRole;

    if (artistId && booking.artistId === artistId) {
      senderRole = NegotiationSenderRole.ARTIST;
    } else if (managerId) {
      const represents = await this.representationRepository.existsActiveRepresentation({
        artistId: booking.artistId,
        managerId,
      });
      if (!represents) throw new ForbiddenException();
      senderRole = NegotiationSenderRole.MANAGER;
    } else if (venueId && booking.venueId === venueId) {
      senderRole = NegotiationSenderRole.VENUE;
    } else if (promoterId && booking.promoterId === promoterId) {
      senderRole = NegotiationSenderRole.PROMOTER;
    } else {
      throw new ForbiddenException();
    }

    await this.rejectFinalOfferUseCase.execute({
      bookingId,
      senderRole,
      senderUserId: userId,
      senderManagerId: managerId,
    });

    await this.notifyCounterparty({ booking, senderRole, action: 'FINAL_OFFER_REJECTED' });

    return { success: true };
  }

  // CONTRACT
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
    const { userId, venueId, artistId, managerId, promoterId } = req.userContext;

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    let senderRole: NegotiationSenderRole;

    if (artistId && booking.artistId === artistId) {
      senderRole = NegotiationSenderRole.ARTIST;
    } else if (managerId) {
      const represents = await this.representationRepository.existsActiveRepresentation({
        artistId: booking.artistId,
        managerId,
      });
      if (!represents) throw new ForbiddenException();
      senderRole = NegotiationSenderRole.MANAGER;
    } else if (venueId && booking.venueId === venueId) {
      senderRole = NegotiationSenderRole.VENUE;
    } else if (promoterId && booking.promoterId === promoterId) {
      senderRole = NegotiationSenderRole.PROMOTER;
    } else {
      throw new ForbiddenException();
    }

    await this.acceptBookingUseCase.execute({
      bookingId,
      senderUserId: userId,
      senderManagerId: managerId,
      senderRole,
    });

    await this.notifyCounterparty({ booking, senderRole, action: 'BOOKING_ACCEPTED' });

    return { success: true };
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Post(':id/payments/confirm')
  async confirmPayment(
    @Param('id') bookingId: string,
    @Body('milestoneId') milestoneId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, venueId, artistId, managerId, promoterId } = req.userContext;

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isAllowed =
      (artistId && booking.artistId === artistId) ||
      (venueId && booking.venueId === venueId) ||
      (managerId && booking.managerId === managerId) ||
      (promoterId && booking.promoterId === promoterId);

    if (!isAllowed) {
      throw new ForbiddenException();
    }

    await this.confirmPaymentMilestoneUseCase.execute({
      bookingId,
      milestoneId,
      executedByUserId: userId,
    });

    return { success: true };
  }

  private async notifyCounterparty(params: { booking: any; senderRole: NegotiationSenderRole; action: string }) {
    const { booking, senderRole, action } = params;
    if (!booking) return;

    const message = this.buildNotificationMessage({ action, senderRole, booking });

    const payload = {
      bookingId: booking.id,
      action,
      fromRole: senderRole,
      eventId: booking.eventId ?? null,
      eventName: (booking as any).eventName ?? null,
      venueName: (booking as any).venueName ?? null,
      message,
    };

    const isArtistSide =
      senderRole === NegotiationSenderRole.ARTIST || senderRole === NegotiationSenderRole.MANAGER;

    if (isArtistSide) {
      const targetUser = await this.resolveOrganizerUser(booking);
      if (targetUser) {
        await this.notificationRepository.createManyByUser([
          {
            userId: targetUser.userId,
            role: targetUser.role,
            type: 'BOOKING_EVENT',
            payload,
          },
        ]);
      }
      return;
    }

    const artistRecipients = await this.resolveArtistRecipients(booking, payload);
    if (artistRecipients.artistEntry) {
      await this.notificationRepository.createMany([artistRecipients.artistEntry]);
    }

    if (artistRecipients.managerEntry) {
      await this.notificationRepository.createManyByUser([artistRecipients.managerEntry]);
    }
  }

  private async resolveOrganizerUser(booking: any): Promise<{ userId: string; role: string } | null> {
    if (booking.promoterId) {
      const promoter = await this.promoterRepository.findById(booking.promoterId);
      if (promoter?.user_id) {
        return { userId: promoter.user_id, role: 'PROMOTER' };
      }
    }

    if (booking.venueId) {
      const venue = await this.venueRepository.findById(booking.venueId);
      if (venue?.userId) {
        return { userId: venue.userId, role: 'VENUE' };
      }
    }

    if (booking.handledByUserId && booking.handledByRole) {
      return { userId: booking.handledByUserId, role: booking.handledByRole };
    }

    return null;
  }

  private async resolveArtistRecipients(booking: any, payload: Record<string, any>): Promise<{
    artistEntry: { artistId: string; userId?: string; role?: string; type: string; payload: Record<string, any> } | null;
    managerEntry: { userId: string; role: string; type: string; payload: Record<string, any> } | null;
  }> {
    let artistEntry: { artistId: string; userId?: string; role?: string; type: string; payload: Record<string, any> } | null = null;
    let managerEntry: { userId: string; role: string; type: string; payload: Record<string, any> } | null = null;

    if (booking.artistId) {
      const artist = await this.artistRepository.findById(booking.artistId);
      artistEntry = {
        artistId: booking.artistId,
        userId: (artist as any)?.user_id ?? (artist as any)?.userId ?? undefined,
        role: 'ARTIST',
        type: 'BOOKING_EVENT',
        payload,
      } as any;
    }

    if (booking.managerId) {
      const manager = await this.managerRepository.findById(booking.managerId);
      if (manager?.userId) {
        managerEntry = {
          userId: manager.userId,
          role: 'MANAGER',
          type: 'BOOKING_EVENT',
          payload,
        };
      }
    }

    return { artistEntry, managerEntry };
  }

  private buildNotificationMessage(params: { action: string; senderRole: NegotiationSenderRole; booking: any }) {
    const { action, senderRole, booking } = params;
    const artistName = (booking as any).artistName ?? 'El artista';

    const isArtistSide = senderRole === NegotiationSenderRole.ARTIST || senderRole === NegotiationSenderRole.MANAGER;

    const organizerLabel = senderRole === NegotiationSenderRole.VENUE
      ? 'El venue'
      : senderRole === NegotiationSenderRole.PROMOTER
        ? 'El promotor'
        : 'El organizador';

    if (isArtistSide) {
      switch (action) {
        case 'BOOKING_CANCELLED':
          return `${artistName} ha cancelado la contratación`;
        case 'BOOKING_ACCEPTED':
          return `${artistName} ha aceptado la contratación`;
        case 'NEGOTIATION_MESSAGE':
          return `${artistName} ha enviado una contraoferta`;
        case 'FINAL_OFFER_SENT':
          return `${artistName} ha enviado una oferta final`;
        case 'FINAL_OFFER_ACCEPTED':
          return `${artistName} ha aceptado la oferta final`;
        case 'FINAL_OFFER_REJECTED':
          return `${artistName} ha rechazado la oferta final`;
        default:
          return `${artistName} ha actualizado la contratación`;
      }
    }

    switch (action) {
      case 'BOOKING_CANCELLED':
        return `${organizerLabel} ha cancelado la contratación`;
      case 'BOOKING_ACCEPTED':
        return `${organizerLabel} ha aceptado la contratación`;
      case 'NEGOTIATION_MESSAGE':
        return `${organizerLabel} ha enviado una contraoferta`;
      case 'FINAL_OFFER_SENT':
        return `${organizerLabel} ha enviado una oferta final`;
      case 'FINAL_OFFER_ACCEPTED':
        return `${organizerLabel} ha aceptado la oferta final`;
      case 'FINAL_OFFER_REJECTED':
        return `${organizerLabel} ha rechazado la oferta final`;
      default:
        return `${organizerLabel} ha actualizado la contratación`;
    }
  }

}
