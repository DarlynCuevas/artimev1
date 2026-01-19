export type CancellationEconomicExecutionType =
  | 'NO_REFUND'
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND';

export class CancellationEconomicExecution {
  id: string;

  cancellationCaseId: string;

  resolutionType: CancellationEconomicExecutionType;

  executedByUserId: string;
  executedByRole: 'ARTIME';

  stripeRefundId?: string;

  executedAt: Date;
}
