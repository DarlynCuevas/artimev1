import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async upsertUserProfile(params: {
    userId: string;
    email?: string | null;
    role: string;
    displayName: string;
  }) {
    const { userId, email, role, displayName } = params;

    const { error } = await this.supabase
      .from('users')
      .upsert({
        id: userId,
        email: email ?? null,
        role,
        display_name: displayName,
        created_at: new Date(),
      }, { onConflict: 'id' });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  }
}
