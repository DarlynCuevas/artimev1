import { Injectable } from "@nestjs/common"
import { CancellationResolutionType } from "../domain/cancellation-resolution-type.enum"
import type { CancellationCaseRepository } from "../repositories/cancellation-case.repository.interface"
import type { CancellationResolutionRepository } from "../resolutions/repositories/cancellation-resolution.repository.interface"
import { CancellationResolution } from "../resolutions/cancellation-resolution.entity"
import { SystemRole } from "@/src/shared/system-role.enum"

@Injectable()
export class ResolveCancellationCaseUseCase {
  constructor(
    private readonly cancellationCaseRepo: CancellationCaseRepository,
    private readonly resolutionRepo: CancellationResolutionRepository,
  ) {}

  async execute(params: {
    cancellationCaseId: string
    resolutionType: CancellationResolutionType
    refundAmount: number
    resolvedByUserId: string
    resolvedByRole: string
    notes?: string
  }) {
    const cancellationCase =
      await this.cancellationCaseRepo.findById(params.cancellationCaseId)

    if (!cancellationCase || cancellationCase.status !== 'OPEN') {
      throw new Error('Cancellation case not resolvable')
    }

    const resolution = new CancellationResolution({
      id: crypto.randomUUID(),
      cancellationCaseId: params.cancellationCaseId,
      resolutionType: params.resolutionType,
      refundAmount: params.refundAmount,
      resolvedByUserId: params.resolvedByUserId,
      resolvedByRole: params.resolvedByRole as SystemRole,
      notes: params.notes,
      resolvedAt: new Date(),
    })

    await this.resolutionRepo.save(resolution)

    await this.cancellationCaseRepo.markResolved(params.cancellationCaseId)
  }
}
