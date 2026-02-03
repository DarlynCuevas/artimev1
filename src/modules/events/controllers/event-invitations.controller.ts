import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserContextGuard } from '../../auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { AcceptInvitationUseCase } from '../use-cases/accept-invitation.usecase';
import { DeclineInvitationUseCase } from '../use-cases/decline-invitation.usecase';

@Controller('event-invitations')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class EventInvitationsController {
  constructor(
    private readonly acceptInvitationUseCase: AcceptInvitationUseCase,
    private readonly declineInvitationUseCase: DeclineInvitationUseCase,
  ) {}

  @Post(':id/accept')
  async accept(
    @Req() req: AuthenticatedRequest,
    @Param('id') invitationId: string,
  ) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    await this.acceptInvitationUseCase.execute(invitationId, artistId, userId);
  }

  @Post(':id/decline')
  async decline(
    @Req() req: AuthenticatedRequest,
    @Param('id') invitationId: string,
  ) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    await this.declineInvitationUseCase.execute(invitationId, artistId, userId);
  }
}
