import { CancellationEconomicExecution } from '../cancellation-economic-execution.entity';

export interface CancellationEconomicExecutionRepository {
  findByCancellationCaseId(
    cancellationCaseId: string,
  ): Promise<CancellationEconomicExecution | null>;

  save(
    execution: CancellationEconomicExecution,
  ): Promise<void>;
}
