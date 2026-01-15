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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { Request } from 'express';


import { CreateEventUseCase } from '../use-cases/create-event.usecase';
import { UpdateEventUseCase } from '../use-cases/update-event.usecase';
import { CancelEventUseCase } from '../use-cases/cancel-event.usecase';
import { ChangeEventStatusUseCase } from '../use-cases/change-event-status.usecase';
import { AcceptInvitationUseCase } from '../use-cases/accept-invitation.usecase';
import { DeclineInvitationUseCase } from '../use-cases/decline-invitation.usecase';

import { GetEventsQuery } from '../queries/get-events.query';
import { GetEventDetailQuery } from '../queries/get-event-detail.query';

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

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    private readonly createEventUseCase: CreateEventUseCase,
    private readonly updateEventUseCase: UpdateEventUseCase,
    private readonly cancelEventUseCase: CancelEventUseCase,
    private readonly changeEventStatusUseCase: ChangeEventStatusUseCase,
    private readonly acceptInvitationUseCase: AcceptInvitationUseCase,
    private readonly declineInvitationUseCase: DeclineInvitationUseCase,
    private readonly getEventsQuery: GetEventsQuery,
    private readonly getEventDetailQuery: GetEventDetailQuery,
    private readonly getEventInterestedArtistsQuery: GetEventInterestedArtistsQuery,
    private readonly getEventBookingsQuery: GetEventBookingsQuery,
    private readonly linkBookingToEventUseCase: LinkBookingToEventUseCase,
    private readonly updateEventBookingOrganizationUseCase: UpdateEventBookingOrganizationUseCase,
    private readonly updateEventVisibilityUseCase: UpdateEventVisibilityUseCase,
  ) { }

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateEventDto) {
    const userId = req.user.sub;

    await this.createEventUseCase.execute({
      name: dto.name,
      ownerId: userId,
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
    const userId = req.user.sub;
    return this.getEventsQuery.execute(userId);
  }

  @Get(':id')
  async detail(
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.event) {
      throw new Error('Event not loaded by middleware');
    }
    return this.getEventDetailQuery.execute(req.event);
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
    await this.changeEventStatusUseCase.execute({
      eventId: id,
      requesterId: req.user.sub,
      nextStatus: EventStatus.SEARCHING,
    });
  }

  //INVITACIONES 
  @Post('/invitations/:invitationId/accept')
  async accept(
    @Req() req: AuthenticatedRequest,
    @Param('invitationId') invitationId: string,
  ) {
    await this.acceptInvitationUseCase.execute(invitationId, req.user.sub);
  }

  @Post('/invitations/:invitationId/decline')
  async decline(
    @Req() req: AuthenticatedRequest,
    @Param('invitationId') invitationId: string,
  ) {
    await this.declineInvitationUseCase.execute(invitationId, req.user.sub);
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.getEventBookingsQuery.execute(req.event!);
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
  @Patch(':id/visibility')
  @UseGuards(EventOrganizerGuard, EventNotCompletedGuard)
  async updateVisibility(
    @Req() req: AuthenticatedRequest,
    @Body('visibility') visibility: EventVisibility
  ) {
    await this.updateEventVisibilityUseCase.execute(
      req.event!,
      visibility
    );
    // Recupera el evento actualizado y lo retorna
    return this.getEventDetailQuery.execute(req.event!);
  }
}