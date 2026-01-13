import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { EventInvitationRepository } from '../repositories/event-invitation.repository';
import { EventInvitation } from '../entities/event-invitation.entity';
import { EVENT_INVITATION_REPOSITORY } from '../repositories/event-invitation.repository.token';

export class SendInvitationUseCase {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly repo: EventInvitationRepository,
  ) {}

  async execute(eventId: string, artistId: string): Promise<void> {
    const existing = await this.repo.findByEventAndArtist(eventId, artistId);
    if (existing) return; // idempotente

    const invitation = new EventInvitation(
      randomUUID(),
      eventId,
      artistId,
      'SENT',
      new Date(),
      new Date(),
    );

    await this.repo.create(invitation);
  }
}
