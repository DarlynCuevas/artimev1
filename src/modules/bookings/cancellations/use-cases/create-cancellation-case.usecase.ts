import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CANCELLATION_CASE_REPOSITORY } from '../repositories/cancellation-case.repository.interface';
import type { CancellationCaseRepository } from '../repositories/cancellation-case.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
import { CancellationCase } from '../entities/cancellation-case.entity';
import { CancellationStatus } from '../enums/cancellation-status.enum';
import { CancellationReason } from '../enums/cancellation-reason.enum';

interface CreateCancellationCaseParams {
  bookingId: string;
  requestedByUserId: string;
  requestedByRole: 'ARTIST' | 'MANAGER' | 'VENUE' | 'PROMOTER';
  reason: CancellationReason;
  description?: string;
  bookingStatusAtCancellation: BookingStatus;
  paymentStatusAtCancellation: 'NONE' | 'PAID_PARTIAL' | 'PAID_FULL';
}

@Injectable()
export class CreateCancellationCaseUseCase {
  constructor(
    @Inject(CANCELLATION_CASE_REPOSITORY)
    private readonly cancellationCaseRepository: CancellationCaseRepository,
  ) {}

  async execute(params: CreateCancellationCaseParams): Promise<void> {
    const existing =
      await this.cancellationCaseRepository.findByBookingId(params.bookingId);

    if (existing) {
      throw new ConflictException(
        'Cancellation case already exists for this booking',
      );
    }

    const cancellationCase: CancellationCase = {
      id: crypto.randomUUID(),
      bookingId: params.bookingId,
      requestedByUserId: params.requestedByUserId,
      requestedByRole: params.requestedByRole,
      reason: params.reason,
      description: params.description,
      bookingStatusAtCancellation: params.bookingStatusAtCancellation,
      paymentStatusAtCancellation: params.paymentStatusAtCancellation,
      status: CancellationStatus.OPEN,
      createdAt: new Date(),
    };

    await this.cancellationCaseRepository.save(cancellationCase);
  }
}
