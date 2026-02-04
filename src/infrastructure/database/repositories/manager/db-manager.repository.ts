import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import type { Manager } from '@/src/modules/managers/entities/manager.entity';

@Injectable()
export class DbManagerRepository implements ManagerRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findByUserId(userId: string): Promise<Manager | null> {
    const { data, error } = await this.supabase
      .from('managers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRow(data);
  }

  async findById(id: string): Promise<Manager | null> {
    const { data, error } = await this.supabase
      .from('managers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRow(data);
  }

  async update(data: { id: string; name?: string }): Promise<void> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) {
      updatePayload.name = data.name;
    }

    const { error } = await this.supabase
      .from('managers')
      .update(updatePayload)
      .eq('id', data.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  private mapRow(row: any): Manager {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email ?? null,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
  }
}
