import {
  Body,
  Controller,
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
      paymentIntentId: string
      refundAmount: number
    },
    @Req() req: AuthenticatedRequest,
  ) {
    await this.executeCancellationRefund.execute({
      cancellationCaseId,
      paymentIntentId: body.paymentIntentId,
      refundAmount: body.refundAmount,
      executedByUserId: req.user.sub,
      executedByRole: req.user.role as SystemRole,
    })

    return {
      status: 'REFUND_EXECUTED',
    }
  }
}
