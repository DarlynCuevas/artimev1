import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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

  async ensureUserProfile(params: {
    userId: string;
    email?: string | null;
    role: string;
    displayName: string;
  }) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', params.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data?.id) {
      return { ok: true };
    }

    return this.upsertUserProfile(params);
  }

  async updateProfileImage(params: { userId: string; imagePath: string | null }) {
    const { userId, imagePath } = params;
    const { data, error } = await this.supabase
      .from('users')
      .update({
        profile_image_path: imagePath,
      })
      .eq('id', userId)
      .select('id');

    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      throw new Error('USER_PROFILE_NOT_FOUND');
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

  async getFiscalDataByUserId(userId: string): Promise<{
    fiscalName: string;
    taxId: string;
    fiscalAddress: string;
    fiscalCountry: string;
    iban?: string | null;
  }> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('fiscal_name,tax_id,fiscal_address,fiscal_country,iban')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return {
        fiscalName: '',
        taxId: '',
        fiscalAddress: '',
        fiscalCountry: 'España',
        iban: null,
      };
    }

    return {
      fiscalName: data.fiscal_name ?? '',
      taxId: data.tax_id ?? '',
      fiscalAddress: data.fiscal_address ?? '',
      fiscalCountry: data.fiscal_country ?? 'España',
      iban: data.iban ?? null,
    };
  }

  async updateFiscalDataByUserId(
    userId: string,
    payload: Partial<{
      fiscalName: string;
      taxId: string;
      fiscalAddress: string;
      fiscalCountry: string;
      iban: string;
    }>,
  ) {
    const current = await this.getFiscalDataByUserId(userId);
    const merged = {
      fiscalName: payload.fiscalName ?? current.fiscalName,
      taxId: payload.taxId ?? current.taxId,
      fiscalAddress: payload.fiscalAddress ?? current.fiscalAddress,
      fiscalCountry: payload.fiscalCountry ?? current.fiscalCountry,
      iban: payload.iban ?? current.iban ?? null,
    };

    const { error } = await this.supabase
      .from('user_settings')
      .upsert(
        {
          user_id: userId,
          fiscal_name: merged.fiscalName,
          tax_id: merged.taxId,
          fiscal_address: merged.fiscalAddress,
          fiscal_country: merged.fiscalCountry,
          iban: merged.iban,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      throw new Error(error.message);
    }

    return merged;
  }

  async changeEmailByUserId(userId: string, email: string) {
    const targetEmail = (email ?? '').trim().toLowerCase();
    if (!targetEmail) {
      throw new BadRequestException('EMAIL_REQUIRED');
    }

    const { error } = await (this.supabase.auth.admin as any).updateUserById(userId, {
      email: targetEmail,
      email_confirm: false,
    });

    if (error) {
      throw new Error(error.message);
    }

    await this.supabase
      .from('users')
      .upsert(
        {
          id: userId,
          email: targetEmail,
        },
        { onConflict: 'id' },
      );

    return { ok: true };
  }

  async changePasswordByUserId(
    userId: string,
    payload: { currentPassword?: string; newPassword: string },
  ) {
    const newPassword = payload.newPassword ?? '';
    if (newPassword.length < 8) {
      throw new BadRequestException('PASSWORD_TOO_SHORT');
    }

    const { error } = await (this.supabase.auth.admin as any).updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  }

  async closeOtherSessionsByUserId(userId: string) {
    const { error } = await (this.supabase.auth.admin as any).signOut(userId, 'others');

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  }

  async deleteAccountByUserId(userId: string) {
    const cleanup = [
      this.supabase.from('user_notification_preferences').delete().eq('user_id', userId),
      this.supabase.from('user_settings').delete().eq('user_id', userId),
      this.supabase.from('user_verifications').delete().eq('user_id', userId),
      this.supabase.from('artists').delete().eq('user_id', userId),
      this.supabase.from('venues').delete().eq('user_id', userId),
      this.supabase.from('promoters').delete().eq('user_id', userId),
      this.supabase.from('managers').delete().eq('user_id', userId),
      this.supabase.from('users').delete().eq('id', userId),
    ];

    await Promise.allSettled(cleanup);

    const { error } = await (this.supabase.auth.admin as any).deleteUser(userId, false);
    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  }
}
