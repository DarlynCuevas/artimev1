import {
  Controller,
  Post,
  Param,
  Req,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';

import { ExecuteCancellationEconomicImpactUseCase } from '../use-cases/execute-cancellation-economic-impact.usecase';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)  
@Controller('internal/cancellations')
export class CancellationEconomicExecutionsController {
  constructor(
    private readonly executeCancellationEconomicImpactUseCase: ExecuteCancellationEconomicImpactUseCase,
  ) {}

  @Post(':cancellationCaseId/execute-economic-impact')
  async execute(
    @Param('cancellationCaseId') cancellationCaseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;

    if (user.role !== 'ARTIME') {
      throw new ForbiddenException('ONLY_ARTIME_CAN_EXECUTE_ECONOMIC_IMPACT');
    }

    await this.executeCancellationEconomicImpactUseCase.execute({
      cancellationCaseId,
      executedByUserId: user.sub,
      executedByRole: 'ARTIME',
    });

    return { status: 'ECONOMIC_IMPACT_EXECUTED' };
  }
}
