import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserContextGuard } from '../../auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';

@Controller('notifications')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class NotificationsController {
  constructor(private readonly notificationsRepo: ArtistNotificationRepository) {}

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
  ) {
    const { userId } = req.userContext;
    const parsedLimit = limit ? Number(limit) : undefined;

    return this.notificationsRepo.findByUser({
      userId,
      role: role || undefined,
      limit: parsedLimit,
    });
  }

  @Patch(':id/read')
  async markRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const { userId } = req.userContext;
    await this.notificationsRepo.markRead({ id, userId });
    return { ok: true };
  }
}
