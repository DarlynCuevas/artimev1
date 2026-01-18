import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CancellationResolutionRepository } from '@/src/modules/bookings/cancellations/resolutions/repositories/cancellation-resolution.repository.interface';
import { CancellationResolution } from '@/src/modules/bookings/cancellations/resolutions/cancellation-resolution.entity';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { SUPABASE_CLIENT } from '../../../../database/supabase.module';

@Injectable()
export class DbCancellationResolutionRepository
  implements CancellationResolutionRepository
{
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findByCancellationCaseId(
    cancellationCaseId: string,
  ): Promise<CancellationResolution | null> {
    const { data, error } = await this.supabase
      .from('cancellation_resolutions')
      .select('*')
      .eq('cancellation_case_id', cancellationCaseId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'Error fetching cancellation resolution',
      );
    }

    return data ? (data as CancellationResolution) : null;
  }

  async save(resolution: CancellationResolution): Promise<void> {
    const { error } = await this.supabase
      .from('cancellation_resolutions')
      .insert({
        id: resolution.id,
        cancellation_case_id: resolution.cancellationCaseId,
        resolution_type: resolution.resolutionType,
        refund_amount: resolution.refundAmount ?? null,
        resolved_by_user_id: resolution.resolvedByUserId,
        resolved_by_role: resolution.resolvedByRole,
        notes: resolution.notes ?? null,
        resolved_at: resolution.resolvedAt,
      });

    if (error) {
      throw new InternalServerErrorException(
        'Error saving cancellation resolution',
      );
    }
  }
}
