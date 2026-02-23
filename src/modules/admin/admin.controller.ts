import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('verifications')
  async listVerifications(
    @Query('status') status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL',
  ) {
    return this.adminService.listVerifications(status ?? 'PENDING');
  }

  @Patch('verifications/:userId')
  async reviewVerification(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string | null },
  ) {
    return this.adminService.reviewVerification(req.user.sub, userId, body);
  }
}

