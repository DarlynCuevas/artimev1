import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';
import type { Promoter } from '../../../../modules/promoter/repositories/domain/promoter.entity';
import type { PromoterRepository } from '../../../../modules/promoter/repositories/promoter.repository.interface';

@Injectable()
export class DbPromoterRepository implements PromoterRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async findByUserId(userId: string): Promise<Promoter | null> {
    const { data, error } = await this.supabase
      .from('promoters')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToPromoter(data);
  }

  async findById(id: string): Promise<Promoter | null> {
    const { data, error } = await this.supabase
      .from('promoters')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToPromoter(data);
  }

  private mapRowToPromoter(row: any): Promoter {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      city: row.city ?? null,
      country: row.country ?? null,
      description: row.description ?? null,
      event_types: row.event_types ?? null,
      is_public: row.is_public ?? null,
      show_past_events: row.show_past_events ?? null,
      created_at: new Date(row.created_at),
    };
  }

  async update(data: {
    id: string;
    name?: string;
    description?: string;
    city?: string;
    country?: string;
    eventTypes?: string[];
    isPublic?: boolean;
    showPastEvents?: boolean;
  }): Promise<void> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.city !== undefined) updatePayload.city = data.city;
    if (data.country !== undefined) updatePayload.country = data.country;
    if (data.eventTypes !== undefined) updatePayload.event_types = data.eventTypes;
    if (data.isPublic !== undefined) updatePayload.is_public = data.isPublic;
    if (data.showPastEvents !== undefined) updatePayload.show_past_events = data.showPastEvents;

    const { error } = await this.supabase
      .from('promoters')
      .update(updatePayload)
      .eq('id', data.id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
