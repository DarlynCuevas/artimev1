import { EventInvitation } from '../entities/event-invitation.entity';


export interface EventInvitationRepository {
  create(invitation: EventInvitation): Promise<void>;

  findById(invitationId: string): Promise<EventInvitation | null>;

  findByEvent(eventId: string): Promise<EventInvitation[]>;

  findByEventAndArtist(
    eventId: string,
    artistId: string,
  ): Promise<EventInvitation | null>;

  update(invitation: EventInvitation): Promise<void>;
}
