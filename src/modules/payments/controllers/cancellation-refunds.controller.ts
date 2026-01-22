import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request'
import { JwtAuthGuard } from '../../auth/jwt-auth.guard'
import { ExecuteCancellationRefundUseCase } from '../use-cases/cancellation-refund/execute-cancellation-refund.usecase'
import { SystemRole } from '@/src/shared/system-role.enum'

@Controller('internal/cancellations-refunds')
export class CancellationRefundsController {
  constructor(
    private readonly executeCancellationRefund: ExecuteCancellationRefundUseCase,
  ) {}

 @UseGuards(JwtAuthGuard)
@Post(':cancellationCaseId')
async executeRefund(
  @Param('cancellationCaseId') cancellationCaseId: string,
  @Body()
  body: {
    paymentIntentId: string;
    refundAmount: number;
  },
  @Req() req: AuthenticatedRequest,
) {
  const ARTIME_USER_IDS = [
    process.env.ARTIME_ADMIN_USER_ID,
  ];

  if (!ARTIME_USER_IDS.includes(req.user.sub)) {
    throw new ForbiddenException('ONLY_ARTIME_CAN_EXECUTE_REFUNDS');
  }

  await this.executeCancellationRefund.execute({
    cancellationCaseId,
    paymentIntentId: body.paymentIntentId,
    refundAmount: body.refundAmount,
    executedByUserId: req.user.sub,
    executedByRole: SystemRole.ARTIME,
  });

  return {
    status: 'REFUND_EXECUTED',
  };
}
}