import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { Inject } from '@nestjs/common';
import type { CancellationCaseRepository } from '../../repositories/cancellation-case.repository.interface';
import { CANCELLATION_CASE_REPOSITORY } from '../../repositories/cancellation-case.repository.interface';

import {
  CancellationResolution,
  CancellationResolutionType,
} from '../cancellation-resolution.entity';
import { CancellationStatus } from '../../enums/cancellation-status.enum';
import type { CancellationResolutionRepository } from '../repositories/cancellation-resolution.repository.interface';
import { SystemRole } from '@/src/shared/system-role.enum';
// El token se define en el módulo como string
const CANCELLATION_RESOLUTION_REPOSITORY = 'CANCELLATION_RESOLUTION_REPOSITORY';

@Injectable()
export class ResolveCancellationCaseUseCase {
  constructor(
    @Inject(CANCELLATION_CASE_REPOSITORY)
    private readonly cancellationCaseRepository: CancellationCaseRepository,
    @Inject(CANCELLATION_RESOLUTION_REPOSITORY)
    private readonly cancellationResolutionRepository: CancellationResolutionRepository,
  ) { }

  async execute(params: {
    cancellationCaseId: string;
    resolutionType: CancellationResolutionType;
    refundAmount?: number;
    notes?: string;
    resolvedByUserId: string;
    resolvedByRole: 'ARTIME';
  }): Promise<void> {
    const {
      cancellationCaseId,
      resolutionType,
      refundAmount,
      notes,
      resolvedByUserId,
      resolvedByRole,
    } = params;

    if (resolvedByRole !== 'ARTIME') {
      throw new ForbiddenException('ONLY_ARTIME_CAN_RESOLVE_CANCELLATIONS');
    }

    const cancellationCase =
      await this.cancellationCaseRepository.findById(cancellationCaseId);

    if (!cancellationCase) {
      throw new NotFoundException('CANCELLATION_CASE_NOT_FOUND');
    }

    if (cancellationCase.status !== CancellationStatus.OPEN) {
      throw new BadRequestException('CANCELLATION_CASE_ALREADY_RESOLVED');
    }

    const existingResolution =
      await this.cancellationResolutionRepository.findByCancellationCaseId(
        cancellationCaseId,
      );

    if (existingResolution) {
      throw new BadRequestException('CANCELLATION_ALREADY_RESOLVED');
    }

    if (resolutionType === 'PARTIAL_REFUND') {
      if (!refundAmount || refundAmount <= 0) {
        throw new BadRequestException('INVALID_REFUND_AMOUNT');
      }
    }
    let finalRefundAmount: number;

    if (resolutionType === 'NO_REFUND') {
      finalRefundAmount = 0;
    } else {
      if (refundAmount === undefined) {
        throw new Error('refundAmount is required');
      }
      finalRefundAmount = refundAmount;
    }
    const resolution: CancellationResolution = {
      id: uuid(),
      cancellationCaseId,
      resolutionType,
      refundAmount: finalRefundAmount,
      resolvedByUserId,
      resolvedByRole: SystemRole.ARTIME,
      notes,
      resolvedAt: new Date(),
    };


    await this.cancellationResolutionRepository.save(resolution);

    cancellationCase.status = CancellationStatus.RESOLVED;
    cancellationCase.resolvedAt = new Date();

    await this.cancellationCaseRepository.update(cancellationCase);
  }
}
