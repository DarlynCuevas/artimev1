import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';
import type { RepresentationRequestRepository, RepresentationRequest } from '@/src/modules/representations/repositories/representation-request.repository.interface';

@Injectable()
export class SupabaseRepresentationRequestRepository implements RepresentationRequestRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async create(params: { artistId: string; managerId: string; commissionPercentage: number }): Promise<RepresentationRequest> {
    const { data, error } = await this.supabase
      .from('representation_requests')
      .insert({
        artist_id: params.artistId,
        manager_id: params.managerId,
        commission_percentage: params.commissionPercentage,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error('No se pudo crear la solicitud de representación');
    }

    return this.mapRow(data);
  }

  async findById(id: string): Promise<RepresentationRequest | null> {
    const { data, error } = await this.supabase
      .from('representation_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return this.mapRow(data);
  }

  async findPendingByArtistAndManager(artistId: string, managerId: string): Promise<RepresentationRequest | null> {
    const { data, error } = await this.supabase
      .from('representation_requests')
      .select('*')
      .eq('artist_id', artistId)
      .eq('manager_id', managerId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return this.mapRow(data);
  }

  async markResolved(params: { id: string; status: 'ACCEPTED' | 'REJECTED'; resolvedAt: string }): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('representation_requests')
      .update({ status: params.status, resolved_at: params.resolvedAt })
      .eq('id', params.id)
      .eq('status', 'PENDING')
      .select('id')
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.id);
  }

  private mapRow(row: any): RepresentationRequest {
    return {
      id: row.id,
      artistId: row.artist_id,
      managerId: row.manager_id,
      commissionPercentage: Number(row.commission_percentage),
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at ?? null,
    };
  }
}
