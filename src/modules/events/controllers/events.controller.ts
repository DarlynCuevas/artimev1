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
  ) {}

  @Post()
async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateEventDto) {
  const userId = req.user.id;

    await this.createEventUseCase.execute({
      name: dto.name,
      ownerId: userId,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      venueId: dto.venueId ?? null,
      type: dto.type ?? null,
      estimatedBudget: dto.estimatedBudget ?? null,
      description: dto.description ?? null,
    });
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const userId = (req.user as { id: string }).id;

    return this.getEventsQuery.execute(userId);
  }

  @Get(':id')
  async detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = (req.user as { id: string }).id;

    return this.getEventDetailQuery.execute(id, userId);
  }

  @Patch(':id')
  async update(
    req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const userId = (req.user as { id: string }).id;


    await this.updateEventUseCase.execute({
      eventId: id,
      requesterId: userId,
      ...body,
    });
  }

  @Post(':id/cancel')
  async cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = (req.user as { id: string }).id;


    await this.cancelEventUseCase.execute({
      eventId: id,
      requesterId: userId,
    });
  }

  @Post(':id/start-search')
async startSearch(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
  await this.changeEventStatusUseCase.execute({
    eventId: id,
    requesterId: req.user.id,
    nextStatus: EventStatus.SEARCHING,
  });
}

//INVITACIONES 
@Post('/invitations/:invitationId/accept')
async accept(
  @Req() req: AuthenticatedRequest,
  @Param('invitationId') invitationId: string,
) {
  await this.acceptInvitationUseCase.execute(invitationId, req.user.id);
}

@Post('/invitations/:invitationId/decline')
async decline(
  @Req() req: AuthenticatedRequest,
  @Param('invitationId') invitationId: string,
) {
  await this.declineInvitationUseCase.execute(invitationId, req.user.id);
}

@Get(':id/interested-artists')
async interestedArtists(
  @Req() req: AuthenticatedRequest,
  @Param('id') id: string,
) {
  // Seguridad adicional (owner) se puede añadir luego
  return this.getEventInterestedArtistsQuery.execute(id);
}


}
