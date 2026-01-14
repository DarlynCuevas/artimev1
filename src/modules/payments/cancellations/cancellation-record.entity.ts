import { CancellationInitiator } from 'src/modules/bookings/cancellations/cancellation-initiator.enum';
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
  }): CancellationRecord {
    return new CancellationRecord(
      params.id,
      params.bookingId,
      params.initiator,
      params.reason ?? null,
      CancellationStatus.PENDING_REVIEW,
      new Date(),
      null,
    );
  }
}