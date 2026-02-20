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

  async updateProfileImage(params: { userId: string; imagePath: string | null }) {
    const { userId, imagePath } = params;
    const { error } = await this.supabase
      .from('users')
      .update({
        profile_image_path: imagePath,
      })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  }

  async getProfileImagePath(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('profile_image_path')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.profile_image_path ?? null;
  }

  async getSignedProfileImageUrlByUserId(userId: string): Promise<string | null> {
    const path = await this.getProfileImagePath(userId);
    if (!path) return null;

    const { data, error } = await this.supabase.storage
      .from('profile-images')
      .createSignedUrl(path, 60 * 60);

    if (error) {
      return null;
    }

    return data.signedUrl ?? null;
  }
}
