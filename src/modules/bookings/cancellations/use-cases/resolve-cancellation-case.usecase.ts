import { ConflictException, Injectable } from "@nestjs/common"
import { CancellationResolutionType } from "../domain/cancellation-resolution-type.enum"
import type { CancellationCaseRepository } from "../repositories/cancellation-case.repository.interface"
import type { CancellationResolutionRepository } from "../resolutions/repositories/cancellation-resolution.repository.interface"
import { CancellationResolution } from "../resolutions/cancellation-resolution.entity"
import { SystemRole } from "@/src/shared/system-role.enum"
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class ResolveCancellationCaseUseCase {
  constructor(
    private readonly cancellationCaseRepo: CancellationCaseRepository,
    private readonly resolutionRepo: CancellationResolutionRepository,
  ) {}

  async execute(params: {
    cancellationCaseId: string
    resolutionType: CancellationResolutionType
    refundAmount?: number
    resolvedByUserId: string
    resolvedByRole: SystemRole
    notes?: string
  }) {
    const cancellationCase =
      await this.cancellationCaseRepo.findById(params.cancellationCaseId)

    if (!cancellationCase || cancellationCase.status !== 'OPEN') {
      throw new ConflictException('CANCELLATION_CASE_NOT_RESOLVABLE')
    }

    let finalRefundAmount: number

    if (params.resolutionType === 'NO_REFUND') {
      if (params.refundAmount && params.refundAmount > 0) {
        throw new BadRequestException('NO_REFUND_MUST_HAVE_ZERO_AMOUNT')
      }
      finalRefundAmount = 0
    } else {
      if (params.refundAmount === undefined || params.refundAmount <= 0) {
        throw new BadRequestException('REFUND_AMOUNT_REQUIRED')
      }
      finalRefundAmount = params.refundAmount
    }

    const resolution = new CancellationResolution({
      id: crypto.randomUUID(),
      cancellationCaseId: params.cancellationCaseId,
      resolutionType: params.resolutionType,
      refundAmount: finalRefundAmount,
      resolvedByUserId: params.resolvedByUserId,
      resolvedByRole: params.resolvedByRole,
      notes: params.notes,
      resolvedAt: new Date(),
    })

    await this.resolutionRepo.save(resolution)

    await this.cancellationCaseRepo.markResolved(params.cancellationCaseId)
  }
}
