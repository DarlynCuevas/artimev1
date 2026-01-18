import { CancellationInitiator } from '@/src/modules/bookings/cancellations/enums/cancellation-initiator.enum';
import { CancellationStatus } from './cancellation-status.enum';

export class CancellationRecord {
  /**
   * Reservado para v2/admin. No usar en ARTIME v1.
   */
  readonly initiated_by?: string;
  description: null;
  previousStatus: any;
  resultingStatus: any;
  reviewStatus: any;

  constructor(
    readonly id: string,
    readonly bookingId: string,
    readonly initiator: CancellationInitiator,
    readonly reason: string | null,
    readonly status: CancellationStatus,
    readonly createdAt: Date,
    readonly resolvedAt: Date | null,
  ) {}

  static create(params: {
    id: string;
    bookingId: string;
    initiator: CancellationInitiator;
    reason?: string;
    previousStatus?: any;
    resultingStatus?: any;
  }): CancellationRecord {
    const record = new CancellationRecord(
      params.id,
      params.bookingId,
      params.initiator,
      params.reason ?? null,
      CancellationStatus.PENDING_REVIEW,
      new Date(),
      null,
    );
    record.previousStatus = params.previousStatus ?? null;
    record.resultingStatus = params.resultingStatus ?? null;
    return record;
  }
}