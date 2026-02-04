// events.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';


import { CreateEventUseCase } from '../use-cases/create-event.usecase';
import { UpdateEventUseCase } from '../use-cases/update-event.usecase';
import { CancelEventUseCase } from '../use-cases/cancel-event.usecase';
import { ChangeEventStatusUseCase } from '../use-cases/change-event-status.usecase';

import { GetEventsQuery } from '../queries/get-events.query';
import { GetEventDetailQuery } from '../queries/get-event-detail.query';
import { GetEventInvitationsQuery } from '../queries/get-event-invitations.query';

import { CreateEventDto } from '../dto/create-event.dto';
import type { AuthenticatedRequest } from 'src/shared/authenticated-request';
import { EventStatus } from '../enums/event-status.enum';
import { GetEventInterestedArtistsQuery } from '../queries/get-event-interested-artists.query';
import { GetEventBookingsQuery } from '../queries/get-event-bookings.query';
import { EventVisibility } from '../enums/event-visibility.enum';
import { BookingBelongsToOrganizerGuard } from '../guards/booking-belongs-to-organizer.guard';
import { EventOrganizerGuard } from '../guards/event-organizer.guard';
import { EventNotCompletedGuard } from '../guards/event-not-completed.guard';
import { BookingConfirmedGuard } from '../guards/booking-confirmed.guard';

import { LinkBookingToEventUseCase } from '../use-cases/link-booking-to-event.usecase';
import { UpdateEventBookingOrganizationUseCase } from '../use-cases/update-event-booking-organization.usecase';
import { UpdateEventVisibilityUseCase } from '../use-cases/update-event-visibility.usecase';
import { UserContextGuard } from '../../auth/user-context.guard';
import { SendInvitationUseCase } from '../use-cases/send-invitation.usecase';
import { DuplicateEventUseCase } from '../use-cases/duplicate-event.usecase';

@Controller('events')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class EventsController {
  constructor(
    private readonly createEventUseCase: CreateEventUseCase,
    private readonly updateEventUseCase: UpdateEventUseCase,
    private readonly cancelEventUseCase: CancelEventUseCase,
    private readonly changeEventStatusUseCase: ChangeEventStatusUseCase,
    private readonly getEventsQuery: GetEventsQuery,
    private readonly getEventDetailQuery: GetEventDetailQuery,
    private readonly getEventInvitationsQuery: GetEventInvitationsQuery,
    private readonly getEventInterestedArtistsQuery: GetEventInterestedArtistsQuery,
    private readonly getEventBookingsQuery: GetEventBookingsQuery,
    private readonly linkBookingToEventUseCase: LinkBookingToEventUseCase,
    private readonly updateEventBookingOrganizationUseCase: UpdateEventBookingOrganizationUseCase,
    private readonly updateEventVisibilityUseCase: UpdateEventVisibilityUseCase,
    private readonly sendInvitationUseCase: SendInvitationUseCase,
    private readonly duplicateEventUseCase: DuplicateEventUseCase,
  ) { }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateEventDto,
  ) {
    if (!req.user?.sub) {
      throw new ForbiddenException('User not found');
    }
    const { promoterId, venueId } = req.userContext;

    if (!promoterId && !venueId) {
      throw new ForbiddenException(
        'Only promoters or venues can create events',
      );
    }

    // ownerId debe ser string garantizado

    return this.createEventUseCase.execute({
      ownerId: req.user.sub,
      organizerPromoterId: promoterId ? promoterId : null,
      organizerVenueId: venueId ? venueId : null,
      name: dto.name,
      start_date: new Date(dto.start_date),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      venueId: dto.venueId ?? null,
      type: dto.type ?? null,
      estimatedBudget: dto.estimatedBudget ?? null,
      description: dto.description ?? null,
    });
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.sub) {
      throw new Error('User or user.sub not found in request. Check JWT and guard.');
    }

    const { promoterId, venueId } = req.userContext;

    return this.getEventsQuery.execute({
      organizerPromoterId: promoterId ?? null,
      organizerVenueId: venueId ?? null,
    });

  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async detail(
    @Param('id') eventId: string,
  ) {
    return this.getEventDetailQuery.execute(eventId);
  }



  @Patch(':id')
  async update(
    req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const userId = req.user.sub;


    await this.updateEventUseCase.execute({
      eventId: id,
      requesterId: userId,
      ...body,
    });
  }

  @Post(':id/cancel')
  async cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user.sub;


    await this.cancelEventUseCase.execute({
      eventId: id,
      requesterId: userId,
    });
  }

  @Post(':id/start-search')
  async startSearch(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const requesterId =
      req.userContext.promoterId ??
      req.userContext.venueId ??
      req.user.sub;

    await this.changeEventStatusUseCase.execute({
      eventId: id,
      requesterId,
      nextStatus: EventStatus.SEARCHING,
    });
  }

  @Post(':id/duplicate')
  @UseGuards(EventOrganizerGuard)
  async duplicateEvent(
    @Req() req: AuthenticatedRequest,
    @Param('id') eventId: string,
  ) {
    const requesterId =
      req.userContext.promoterId ??
      req.userContext.venueId ??
      req.user.sub;

    return this.duplicateEventUseCase.execute({
      eventId,
      requesterId,
    });
  }

  //INVITACIONES 

  @Get(':id/invitations')
  async getInvitations(@Param('id') eventId: string) {
    return this.getEventInvitationsQuery.execute(eventId);
  }

  @Post(':id/invitations')
  @UseGuards(EventOrganizerGuard)
  async sendInvitation(
    @Param('id') eventId: string,
    @Body('artistId') artistId: string,
  ) {
    if (!artistId) {
      throw new ForbiddenException('artistId is required');
    }

    await this.sendInvitationUseCase.execute(eventId, artistId);
  }

  @Get(':id/interested-artists')
  async interestedArtists(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    // Seguridad adicional (owner) se puede añadir luego
    return this.getEventInterestedArtistsQuery.execute(id);
  }

  //Obtener Bookings de un Evento
  @Get(':id/bookings')
  async getEventBookings(
    @Param('id') eventId: string,
  ) {
    return this.getEventBookingsQuery.execute(eventId);
  }



  //Vincular un booking a un event
  @Post(':eventId/bookings/:bookingId')
  @UseGuards(
    EventOrganizerGuard,
    BookingBelongsToOrganizerGuard
  )
  async linkBooking(
    @Req() req: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Param('bookingId') bookingId: string
  ) {
    return this.linkBookingToEventUseCase.execute(eventId, bookingId);
  }


  //Organizar line-up (orden / día / horario)
  @Patch(':eventId/bookings/:bookingId/organization')
  @UseGuards(
    EventOrganizerGuard,
    BookingBelongsToOrganizerGuard,
    BookingConfirmedGuard,
    EventNotCompletedGuard
  )
  async organizeBooking(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @Body() body: {
      event_day_id?: string;
      order?: number;
      start_time?: string;
      end_time?: string;
    }
  ) {
    return this.updateEventBookingOrganizationUseCase.execute(
      bookingId,
      body
    );
  }


  //Cambiar visibilidad del Event
  @UseGuards(JwtAuthGuard, EventOrganizerGuard, EventNotCompletedGuard)
  @Patch(':id/visibility')
  async updateVisibility(
    @Param('id') eventId: string,
    @Body('visibility') visibility: EventVisibility,
  ) {
    await this.updateEventVisibilityUseCase.execute(
      eventId,
      visibility,
    );

    return this.getEventDetailQuery.execute(eventId);
  }
}
