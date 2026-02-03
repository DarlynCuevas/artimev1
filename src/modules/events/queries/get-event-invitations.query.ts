import { Inject } from '@nestjs/common';
import { EVENT_INVITATION_REPOSITORY } from '../repositories/event-invitation.repository.token';
import type { EventInvitationRepository } from '../repositories/event-invitation.repository';

export interface EventInvitationReadDto {
  invitationId: string;
  artistId: string;
  status: string;
}

export class GetEventInvitationsQuery {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly repo: EventInvitationRepository,
  ) {}

  async execute(eventId: string): Promise<EventInvitationReadDto[]> {
    const invitations = await this.repo.findByEvent(eventId);

    return invitations.map((inv) => ({
      invitationId: inv.id,
      artistId: inv.artistId,
      status: inv.status,
    }));
  }
}
