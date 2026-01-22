import { Body, Controller, Param, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserContextGuard } from '../../auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { RespondArtistCallUseCase } from '../use-cases/respond-artist-call.usecase';
import { RespondArtistCallDto } from '../dto/respond-artist-call.dto';

@Controller('artist/artist-calls')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class ArtistCallController {
  constructor(private readonly respondUseCase: RespondArtistCallUseCase) {}

  @Post(':id/respond')
  async respond(
    @Req() req: AuthenticatedRequest,
    @Param('id') callId: string,
    @Body() dto: RespondArtistCallDto,
  ) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    return this.respondUseCase.execute(req.userContext, callId, dto.response);
  }
}