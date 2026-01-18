export type CancellationResolutionType =
  | 'NO_REFUND'
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND';

export class CancellationResolution {
  id: string;

  cancellationCaseId: string;

  resolutionType: CancellationResolutionType;

  refundAmount?: number;

  resolvedByUserId: string;
  resolvedByRole: 'ARTIME';

  notes?: string;

  resolvedAt: Date;
}
