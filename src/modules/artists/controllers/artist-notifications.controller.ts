import { Controller, Get, Patch, Param, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserContextGuard } from '../../auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';

@Controller('artist/notifications')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class ArtistNotificationsController {
  constructor(private readonly notificationsRepo: ArtistNotificationRepository) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const { artistId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    return this.notificationsRepo.findByArtist({ artistId, limit: parsedLimit });
  }

  @Patch(':id/read')
  async markRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const { artistId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    await this.notificationsRepo.markReadByArtist({ id, artistId });
    return { ok: true };
  }
}
