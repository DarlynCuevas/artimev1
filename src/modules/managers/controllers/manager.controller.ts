import { Controller, Get, Patch, Body, Req, UseGuards, ForbiddenException, NotFoundException, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserContextGuard } from '../../auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { ManagerService } from '../services/manager.service';
import { GetManagerRepresentedArtistsUseCase } from '../use-cases/get-manager-represented-artists.usecase';
import { GetManagerActionBookingsUseCase } from '../use-cases/get-manager-action-bookings.usecase';
import { Public } from '@/src/shared/public.decorator';

@Controller('managers')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
    private readonly getManagerRepresentedArtistsUseCase: GetManagerRepresentedArtistsUseCase,
    private readonly getManagerActionBookingsUseCase: GetManagerActionBookingsUseCase,
  ) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    const { managerId } = req.userContext;
    if (!managerId) {
      throw new ForbiddenException('Not a manager');
    }
    return this.managerService.getProfile(managerId);
  }

  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name?: string },
  ) {
    const { managerId } = req.userContext;
    if (!managerId) {
      throw new ForbiddenException('Not a manager');
    }

    await this.managerService.updateProfile({
      managerId,
      name: body.name,
    });
  }

  @Get('me/represented')
  async getRepresented(@Req() req: AuthenticatedRequest) {
    const { managerId } = req.userContext;
    if (!managerId) {
      throw new ForbiddenException('Not a manager');
    }

    return this.getManagerRepresentedArtistsUseCase.execute(managerId);
  }

  @Get('me/action-bookings')
  async getActionBookings(@Req() req: AuthenticatedRequest) {
    const { managerId } = req.userContext;
    if (!managerId) {
      throw new ForbiddenException('Not a manager');
    }

    return this.getManagerActionBookingsUseCase.execute(managerId);
  }

  @Public()
  @Get(':id')
  async getPublicProfile(@Param('id') managerId: string) {
    const manager = await this.managerService.getProfile(managerId);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    return {
      id: manager.id,
      name: manager.name,
      createdAt: manager.createdAt ?? null,
    };
  }
}
