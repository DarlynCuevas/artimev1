import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';

type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  private readonly defaultNotificationPreferences = {
    bookings: true,
    payments: true,
    messages: true,
    system: true,
    marketing: false,
    suggestions: true,
  };

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
    // Use upsert so profile image works even if `users` row was deleted/recreated.
    const { error } = await this.supabase
      .from('users')
      .upsert({
        id: userId,
        profile_image_path: imagePath,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

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

    // Intentar URL firmada (bucket privado)
    const { data, error } = await this.supabase.storage
      .from('profile-images')
      .createSignedUrl(path, 60 * 60);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }

    // Fallback: URL publica (por si el bucket estuviera público)
    const publicUrl = this.supabase.storage
      .from('profile-images')
      .getPublicUrl(path)?.data?.publicUrl ?? null;

    return publicUrl;
  }

  async getNotificationPreferencesByUserId(userId: string): Promise<{
    bookings: boolean;
    payments: boolean;
    messages: boolean;
    system: boolean;
    marketing: boolean;
    suggestions: boolean;
  }> {
    const { data, error } = await this.supabase
      .from('user_notification_preferences')
      .select('bookings,payments,messages,system,marketing,suggestions')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return this.defaultNotificationPreferences;
    }

    if (!data) {
      await this.supabase.from('user_notification_preferences').upsert(
        {
          user_id: userId,
          ...this.defaultNotificationPreferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      return this.defaultNotificationPreferences;
    }

    return {
      bookings: data.bookings ?? this.defaultNotificationPreferences.bookings,
      payments: data.payments ?? this.defaultNotificationPreferences.payments,
      messages: data.messages ?? this.defaultNotificationPreferences.messages,
      system: true,
      marketing: data.marketing ?? this.defaultNotificationPreferences.marketing,
      suggestions: data.suggestions ?? this.defaultNotificationPreferences.suggestions,
    };
  }

  async updateNotificationPreferencesByUserId(
    userId: string,
    prefs: Partial<{
      bookings: boolean;
      payments: boolean;
      messages: boolean;
      system: boolean;
      marketing: boolean;
      suggestions: boolean;
    }>,
  ) {
    const current = await this.getNotificationPreferencesByUserId(userId);
    const merged = {
      ...current,
      ...prefs,
      system: true,
    };

    const { error } = await this.supabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: userId,
          ...merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      throw new Error(error.message);
    }

    return merged;
  }

  async getVerificationInfoByUserId(userId: string): Promise<{
    status: VerificationStatus;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
  }> {
    const { data, error } = await this.supabase
      .from('user_verifications')
      .select('status,submitted_at,reviewed_at,rejection_reason')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return { status: 'UNVERIFIED' };
    }

    return {
      status: (data.status as VerificationStatus) ?? 'UNVERIFIED',
      submittedAt: data.submitted_at ?? null,
      reviewedAt: data.reviewed_at ?? null,
      rejectionReason: data.rejection_reason ?? null,
    };
  }

  async isUserVerified(userId: string): Promise<boolean> {
    const info = await this.getVerificationInfoByUserId(userId);
    return info.status === 'VERIFIED';
  }

  async uploadVerificationDocuments(userId: string, files: Array<{
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  }>) {
    const documentPaths: string[] = [];

    for (const file of files) {
      const extension = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const storagePath = `users/${userId}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from('verification-documents')
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      documentPaths.push(storagePath);
    }

    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('user_verifications')
      .upsert(
        {
          user_id: userId,
          status: 'PENDING',
          submitted_at: now,
          reviewed_at: null,
          rejection_reason: null,
          document_paths: documentPaths,
          updated_at: now,
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      throw new Error(error.message);
    }

    return {
      status: 'PENDING' as VerificationStatus,
      submittedAt: now,
      reviewedAt: null,
      rejectionReason: null,
    };
  }
}
