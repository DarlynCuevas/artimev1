import { Inject } from '@nestjs/common';
import { EVENT_INVITATION_REPOSITORY } from '../repositories/event-invitation.repository.token';
import type { EventInvitationRepository } from '../repositories/event-invitation.repository';

export interface InterestedArtistReadDto {
  invitationId: string;
  artistId: string;
}

export class GetEventInterestedArtistsQuery {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly repo: EventInvitationRepository,
  ) {}

  async execute(eventId: string): Promise<InterestedArtistReadDto[]> {
    const invitations = await this.repo.findByEvent(eventId);

    return invitations
      .filter((inv) => inv.status === 'INTERESTED')
      .map((inv) => ({
        invitationId: inv.id,
        artistId: inv.artistId,
      }));
  }
}
