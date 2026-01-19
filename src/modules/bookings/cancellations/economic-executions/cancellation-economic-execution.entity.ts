import { SystemRole } from "@/src/shared/system-role.enum";

export type CancellationEconomicExecutionType = 'REFUND';

export class CancellationEconomicExecution {
  id: string;
  cancellationCaseId: string;
  resolutionType: CancellationEconomicExecutionType;
  executedByUserId: string;
  executedByRole: SystemRole;
  stripeRefundId: string;
  executedAt: Date;

  constructor(params: {
    id: string;
    cancellationCaseId: string;
    resolutionType: CancellationEconomicExecutionType;
    executedByUserId: string;
    executedByRole: SystemRole;
    stripeRefundId: string;
    executedAt: Date;
  }) {
    Object.assign(this, params);
  }
}
