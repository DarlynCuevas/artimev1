import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';
import type { RepresentationContractRepository, RepresentationContract } from '@/src/modules/representations/repositories/representation-contract.repository.interface';

@Injectable()
export class SupabaseRepresentationContractRepository implements RepresentationContractRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findActiveByArtist(artistId: string): Promise<RepresentationContract | null> {
    const { data, error } = await this.supabase
      .from('representation_contracts')
      .select('*')
      .eq('artist_id', artistId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return this.mapRow(data);
  }

  async createActive(params: { artistId: string; managerId: string; commissionPercentage: number; startDate: string }): Promise<RepresentationContract> {
    const { data, error } = await this.supabase
      .from('representation_contracts')
      .insert({
        artist_id: params.artistId,
        manager_id: params.managerId,
        commission_percentage: params.commissionPercentage,
        status: 'ACTIVE',
        start_date: params.startDate,
      })
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error('No se pudo crear el contrato de representación');
    }

    return this.mapRow(data);
  }

  private mapRow(row: any): RepresentationContract {
    return {
      id: row.id,
      artistId: row.artist_id,
      managerId: row.manager_id,
      commissionPercentage: Number(row.commission_percentage),
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date ?? null,
      createdAt: row.created_at,
    };
  }
}
