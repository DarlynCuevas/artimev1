import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';


import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserContextGuard } from '../../auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { PromoterService } from '../services/promoter.service';
@Controller('promoters')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class PromotersController {
  constructor(private readonly promoterService: PromoterService) {}

  // 🔹 Perfil privado (dashboard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    const { promoterId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('Not a promoter');
    }
    return this.promoterService.getProfile(promoterId);
  }

  // 🔹 Editar perfil
  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name?: string;
      description?: string;
    },
  ) {
    const { promoterId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('Not a promoter');
    }
    await this.promoterService.updateProfile({
      promoterId,
      ...body,
    });
  }

  // 🔹 Eventos del promotor
  @Get('me/events')
  async myEvents(@Req() req: AuthenticatedRequest) {
    const { promoterId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('Not a promoter');
    }
    return this.promoterService.getEvents(promoterId);
  }

  // 🔹 Perfil público
  @Get(':id')
  async publicProfile(@Req() req, @Body('id') id: string) {
    return this.promoterService.getProfile(id);
  }

   @UseGuards(JwtAuthGuard, UserContextGuard)
    @Get('/dashboard')
    async getPromoterDashboard(
      @Req() req: AuthenticatedRequest,
    ) {
      const { promoterId } = req.userContext;

      if (!promoterId) {
        throw new ForbiddenException('ONLY_PROMOTERS_ALLOWED');
      }

      return this.promoterService.getPromoterDashboard(promoterId);
    }

}
