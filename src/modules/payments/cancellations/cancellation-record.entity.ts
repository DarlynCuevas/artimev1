import { CancellationStatus } from './cancellation-status.enum';

export class CancellationRecord {
  constructor(
    readonly id: string,
    readonly bookingId: string,
    readonly initiatedBy: 'ARTIST' | 'VENUE' | 'SYSTEM',
    readonly reason: string | null,
    readonly status: CancellationStatus,
    readonly createdAt: Date,
    readonly resolvedAt: Date | null,
  ) {}

  static create(params: {
    id: string;
    bookingId: string;
    initiatedBy: 'ARTIST' | 'VENUE' | 'SYSTEM';
    reason?: string;
  }): CancellationRecord {
    return new CancellationRecord(
      params.id,
      params.bookingId,
      params.initiatedBy,
      params.reason ?? null,
      CancellationStatus.PENDING_REVIEW,
      new Date(),
      null,
    );
  }
}
