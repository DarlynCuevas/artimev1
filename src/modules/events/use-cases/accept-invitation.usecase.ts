import { Inject } from '@nestjs/common';
import type { EventInvitationRepository } from '../repositories/event-invitation.repository';
import { EVENT_INVITATION_REPOSITORY } from '../repositories/event-invitation.repository.token';
import type { EventRepository } from '../repositories/event.repository';
import { EVENT_REPOSITORY } from '../repositories/event.repository.token';
import { EventStatus } from '../enums/event-status.enum';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { ARTIST_REPOSITORY } from '../../artists/repositories/artist-repository.token';
import type { ArtistRepository } from '../../artists/repositories/artist.repository.interface';
import { PROMOTER_REPOSITORY } from '../../promoter/repositories/promoter-repository.token';
import type { PromoterRepository } from '../../promoter/repositories/promoter.repository.interface';

export class AcceptInvitationUseCase {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly repo: EventInvitationRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
    private readonly artistNotificationRepository: ArtistNotificationRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
  ) {}

  async execute(invitationId: string, artistId: string, userId: string): Promise<void> {
    const invitation = await this.repo.findById(invitationId);
    if (!invitation) throw new Error('INVITATION_NOT_FOUND');
    if (invitation.artistId !== artistId) throw new Error('FORBIDDEN');

    const event = await this.eventRepository.findById(invitation.eventId);
    if (!event) throw new Error('EVENT_NOT_FOUND');
    if (event.status === EventStatus.CANCELLED) {
      throw new Error('EVENT_CANCELLED');
    }

    if (invitation.status !== 'PENDING') {
      throw new Error('INVITATION_ALREADY_RESPONDED');
    }

    invitation.status = 'ACCEPTED';
    invitation.respondedAt = new Date();
    await this.repo.update(invitation);

    await this.artistNotificationRepository.markEventInvitationNotificationsRead({
      userId,
      invitationId,
    });

    const artist = await this.artistRepository.findById(artistId);
    const promoterId = event.organizerPromoterId ?? null;
    if (promoterId) {
      const promoter = await this.promoterRepository.findById(promoterId);
      const promoterUserId = promoter?.user_id;
      if (promoterUserId) {
        await this.artistNotificationRepository.createManyByUser([
          {
            userId: promoterUserId,
            role: 'PROMOTER',
            type: 'EVENT_INVITATION_ACCEPTED',
            payload: {
              eventId: event.id,
              eventName: event.name,
              artistId,
              artistName: artist?.name ?? null,
              invitationId,
            },
          },
        ]);
      }
    }
  }
}
