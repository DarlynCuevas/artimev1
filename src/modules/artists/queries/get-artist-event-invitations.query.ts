import { Inject } from '@nestjs/common';
import { EVENT_INVITATION_REPOSITORY } from '../../events/repositories/event-invitation.repository.token';
import type { EventInvitationRepository } from '../../events/repositories/event-invitation.repository';
import { EVENT_REPOSITORY } from '../../events/repositories/event.repository.token';
import type { EventRepository } from '../../events/repositories/event.repository';

export type ArtistEventInvitationReadDto = {
  invitationId: string;
  event: {
    id: string;
    name: string;
    startDate: string | null;
    location: string | null;
    organizerPromoterId?: string | null;
    organizerVenueId?: string | null;
  };
  status: string;
  createdAt: string;
};

export class GetArtistEventInvitationsQuery {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly invitationRepository: EventInvitationRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(artistId: string): Promise<ArtistEventInvitationReadDto[]> {
    const invitations = await this.invitationRepository.findByArtist(artistId);

    const events = await Promise.all(
      invitations.map((inv) => this.eventRepository.findById(inv.eventId)),
    );

    return invitations.map((inv, index) => {
      const event = events[index];
      return {
        invitationId: inv.id,
        event: {
          id: event?.id ?? inv.eventId,
          name: event?.name ?? 'Evento',
          startDate: event?.startDate
            ? event.startDate.toISOString().slice(0, 10)
            : null,
          location: (event as any)?.location ?? null,
          organizerPromoterId: event?.organizerPromoterId ?? null,
          organizerVenueId: event?.organizerVenueId ?? null,
        },
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
      };
    });
  }
}
