import { EventInvitation } from '../entities/event-invitation.entity';


export interface EventInvitationRepository {
  create(invitation: EventInvitation): Promise<void>;

  findById(invitationId: string): Promise<EventInvitation | null>;

  findByEvent(eventId: string): Promise<EventInvitation[]>;

  findByArtist(artistId: string): Promise<EventInvitation[]>;

  findAccepted(params: {
    eventId: string;
    artistId: string;
  }): Promise<{ id: string } | null>;

  findByEventAndArtist(
    eventId: string,
    artistId: string,
  ): Promise<EventInvitation | null>;

  update(invitation: EventInvitation): Promise<void>;
}
