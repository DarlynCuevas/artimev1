import { Inject } from '@nestjs/common';
import type { EventInvitationRepository } from '../repositories/event-invitation.repository';
import { EVENT_INVITATION_REPOSITORY } from '../repositories/event-invitation.repository.token';

export class DeclineInvitationUseCase {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly repo: EventInvitationRepository,
  ) {}

  async execute(invitationId: string, artistId: string): Promise<void> {
    const invitation = await this.repo.findById(invitationId);
    if (!invitation) throw new Error('INVITATION_NOT_FOUND');
    if (invitation.artistId !== artistId) throw new Error('FORBIDDEN');

    if (invitation.status === 'DECLINED') return;

    invitation.status = 'DECLINED';
    invitation.updatedAt = new Date();
    await this.repo.update(invitation);
  }
}
