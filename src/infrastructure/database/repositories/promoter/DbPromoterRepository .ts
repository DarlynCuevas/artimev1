import { Promoter } from '@/src/modules/promoter/repositories/domain/promoter.entity';
import { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';
    

@Injectable()
export class DbPromoterRepository implements PromoterRepository {
  constructor(@Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,) {}

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
      created_at: new Date(row.created_at),
    };
  }

  async update(data: {
  id: string;
  name?: string;
  description?: string;
}): Promise<void> {
  const { error } = await this.supabase
    .from('promoters')
    .update({
      name: data.name,
      description: data.description,
      updated_at: new Date(),
    })
    .eq('id', data.id);

  if (error) {
    throw new Error(error.message);
  }
}

}
