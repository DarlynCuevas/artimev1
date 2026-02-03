import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { EventInvitationRepository } from '../repositories/event-invitation.repository';
import { EventInvitation } from '../entities/event-invitation.entity';
import { EVENT_INVITATION_REPOSITORY } from '../repositories/event-invitation.repository.token';
import { OutboxRepository } from '@/src/infrastructure/database/repositories/outbox/outbox.repository';

export class SendInvitationUseCase {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly repo: EventInvitationRepository,
    private readonly outboxRepo: OutboxRepository,
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
  }
}
