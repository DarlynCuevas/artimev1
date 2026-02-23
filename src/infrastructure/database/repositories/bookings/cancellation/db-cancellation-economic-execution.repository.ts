import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CancellationEconomicExecution } from '@/src/modules/bookings/cancellations/economic-executions/cancellation-economic-execution.entity';
import { CancellationEconomicExecutionRepository } from '@/src/modules/bookings/cancellations/economic-executions/repositories/cancellation-economic-execution.repository.interface';
import { supabase } from '../../../supabase.client';


@Injectable()
export class DbCancellationEconomicExecutionRepository
  implements CancellationEconomicExecutionRepository
{


  async findByCancellationCaseId(
    cancellationCaseId: string,
  ): Promise<CancellationEconomicExecution | null> {
    const { data, error } = await supabase
      .from('cancellation_economic_executions')
      .select('*')
      .eq('cancellation_case_id', cancellationCaseId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'Error fetching economic execution',
      );
    }

    return data ? (data as CancellationEconomicExecution) : null;
  }

  async save(execution: CancellationEconomicExecution): Promise<void> {
    const { error } = await supabase
      .from('cancellation_economic_executions')
      .insert({
        id: execution.id,
        cancellation_case_id: execution.cancellationCaseId,
        resolution_type: execution.resolutionType,
        executed_by_user_id: execution.executedByUserId,
        executed_by_role: execution.executedByRole,
        stripe_refund_id: execution.stripeRefundId ?? null,
        executed_at: execution.executedAt,
      });

    if (error) {
      throw new InternalServerErrorException(
        'Error saving economic execution',
      );
    }
  }
}
