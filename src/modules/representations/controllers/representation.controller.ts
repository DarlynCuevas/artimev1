import { Body, Controller, ForbiddenException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard';
import { UserContextGuard } from '@/src/modules/auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { RepresentationService } from '../services/representation.service';
import { CreateRepresentationRequestDto } from '../dto/create-representation-request.dto';
import { ResolveRepresentationRequestDto } from '../dto/resolve-representation-request.dto';

@Controller()
@UseGuards(JwtAuthGuard, UserContextGuard)
export class RepresentationController {
  constructor(private readonly representationService: RepresentationService) {}

  @Post('artists/:artistId/representation-requests')
  async createRequest(
    @Param('artistId') artistId: string,
    @Body() dto: CreateRepresentationRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { managerId } = req.userContext;
    if (!managerId) {
      throw new ForbiddenException('ONLY_MANAGER');
    }

    return this.representationService.createRequest({
      artistId,
      managerId,
      commissionPercentage: dto.commissionPercentage,
    });
  }

  @Post('representation-requests/:id/resolve')
  async resolveRequest(
    @Param('id') requestId: string,
    @Body() dto: ResolveRepresentationRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { artistId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    return this.representationService.resolveRequest({
      requestId,
      artistId,
      action: dto.action,
    });
  }
}
