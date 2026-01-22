import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';

import { ResolveCancellationCaseUseCase } from '../use-cases/resolve-cancellation-case.usecase';
import { CancellationResolutionType } from '../cancellation-resolution.entity';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard';

@Controller('internal/cancellations-resolve')
export class CancellationResolutionsController {
  constructor(
    private readonly resolveCancellationCaseUseCase: ResolveCancellationCaseUseCase,
  ) {}
@UseGuards(JwtAuthGuard)
@Post(':cancellationCaseId')
async resolve(
  @Param('cancellationCaseId') cancellationCaseId: string,
  @Req() req: AuthenticatedRequest,
  @Body()
  body: {
    resolutionType: CancellationResolutionType;
    refundAmount?: number;
    notes?: string;
  },
) {
  const ARTIME_USER_IDS = [
    process.env.ARTIME_ADMIN_USER_ID,
  ];

  if (!ARTIME_USER_IDS.includes(req.user.sub)) {
    throw new ForbiddenException('ONLY_ARTIME_CAN_RESOLVE_CANCELLATIONS');
  }

  await this.resolveCancellationCaseUseCase.execute({
    cancellationCaseId,
    resolutionType: body.resolutionType,
    refundAmount: body.refundAmount,
    notes: body.notes,
    resolvedByUserId: req.user.sub,
    resolvedByRole: 'ARTIME',
  });

  return { status: 'RESOLVED' };
}
}