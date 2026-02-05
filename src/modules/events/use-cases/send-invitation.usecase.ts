import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { EventInvitationRepository } from '../repositories/event-invitation.repository';
import { EventInvitation } from '../entities/event-invitation.entity';
import { EVENT_INVITATION_REPOSITORY } from '../repositories/event-invitation.repository.token';
import { OutboxRepository } from '@/src/infrastructure/database/repositories/outbox/outbox.repository';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '@/src/modules/managers/repositories/artist-manager-representation.repository.token';
import type { ArtistManagerRepresentationRepository } from '@/src/modules/managers/repositories/artist-manager-representation.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';

export class SendInvitationUseCase {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly repo: EventInvitationRepository,
    private readonly outboxRepo: OutboxRepository,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly representationRepository: ArtistManagerRepresentationRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
    private readonly artistNotificationRepository: ArtistNotificationRepository,
  ) {}

  async execute(eventId: string, artistId: string): Promise<void> {
    const existing = await this.repo.findByEventAndArtist(eventId, artistId);
    if (existing) {
      if (existing.status === 'DECLINED') {
        existing.status = 'PENDING';
        existing.respondedAt = null;
        await this.repo.update(existing);
      } else {
        return; // idempotente
      }
    }

    const invitation =
      existing && existing.status === 'PENDING'
        ? existing
        : new EventInvitation(
            randomUUID(),
            eventId,
            artistId,
            'PENDING',
            new Date(),
            null,
          );

    if (!existing || existing.status !== 'PENDING') {
      await this.repo.create(invitation);
    }

    await this.outboxRepo.enqueue({
      type: 'EVENT_INVITATION_CREATED',
      payload: {
        artistId,
        eventId,
        invitationId: invitation.id,
      },
    });

    await this.notifyManagerIfAny(artistId, {
      eventId,
      invitationId: invitation.id,
    });
  }

  private async notifyManagerIfAny(
    artistId: string,
    payload: { eventId: string; invitationId: string },
  ) {
    try {
      const representation = await this.representationRepository.findActiveByArtist(artistId);
      if (!representation) return;

      const manager = await this.managerRepository.findById(representation.managerId);
      if (!manager?.userId) return;

      await this.artistNotificationRepository.createManyByUser([
        {
          userId: manager.userId,
          role: 'MANAGER',
          type: 'EVENT_INVITATION_CREATED',
          payload: { ...payload, artistId },
        },
      ]);
    } catch (err) {
      return;
    }
  }
}
