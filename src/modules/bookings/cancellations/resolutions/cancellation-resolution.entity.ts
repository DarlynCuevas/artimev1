import { SystemRole } from "@/src/shared/system-role.enum";

export type CancellationResolutionType =
  | 'NO_REFUND'
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND';

export class CancellationResolution {
  id: string;
  cancellationCaseId: string;
  resolutionType: CancellationResolutionType;
  refundAmount: number;
  resolvedByUserId: string;
  resolvedByRole: SystemRole;
  notes?: string;
  resolvedAt: Date;

  constructor(params: {
    id: string;
    cancellationCaseId: string;
    resolutionType: CancellationResolutionType;
    refundAmount: number;
    resolvedByUserId: string;
    resolvedByRole: SystemRole;
    notes?: string;
    resolvedAt: Date;
  }) {
    Object.assign(this, params);
  }
}
