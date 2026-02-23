import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { MeService } from '../services/me.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';


@Controller()
export class MeController {
  constructor(private readonly meService: MeService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    return this.meService.resolveMe(req.user.sub, { isAdmin: req.user.isAdmin });
  }
}
