import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';

type VerificationReviewStatus = 'VERIFIED' | 'REJECTED';
type VerificationDocument = {
  path: string;
  url: string | null;
};

@Injectable()
export class AdminService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async listVerifications(status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL' = 'PENDING') {
    let query = this.supabase
      .from('user_verifications')
      .select('user_id,status,submitted_at,reviewed_at,rejection_reason,document_paths')
      .order('submitted_at', { ascending: false });

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    if (!rows.length) {
      return [];
    }

    const userIds = rows.map((item) => item.user_id).filter(Boolean);
    const { data: usersData } = await this.supabase
      .from('users')
      .select('id,email,display_name')
      .in('id', userIds);

    const usersById = new Map((usersData ?? []).map((user) => [user.id, user]));

    const rowsWithDocuments = await Promise.all(rows.map(async (item) => {
      const paths = Array.isArray(item.document_paths) ? item.document_paths.filter(Boolean) : [];
      const documents: VerificationDocument[] = await Promise.all(
        paths.map(async (path: string) => {
          const { data: signedData, error: signedError } = await this.supabase.storage
            .from('verification-documents')
            .createSignedUrl(path, 60 * 60);

          if (signedError) {
            return { path, url: null };
          }

          return { path, url: signedData?.signedUrl ?? null };
        }),
      );

      return {
        item,
        documents,
        paths,
      };
    }));

    return rowsWithDocuments.map(({ item, documents, paths }) => {
      const user = usersById.get(item.user_id);
      return {
        userId: item.user_id,
        status: item.status,
        submittedAt: item.submitted_at,
        reviewedAt: item.reviewed_at,
        rejectionReason: item.rejection_reason,
        documentPaths: paths,
        documents,
        user: {
          email: user?.email ?? null,
          displayName: user?.display_name ?? null,
        },
      };
    });
  }

  async reviewVerification(
    adminUserId: string,
    targetUserId: string,
    payload: { status: VerificationReviewStatus; rejectionReason?: string | null },
  ) {
    const current = await this.supabase
      .from('user_verifications')
      .select('status,reviewed_at,rejection_reason')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (current.error || !current.data) {
      throw new Error('VERIFICATION_NOT_FOUND');
    }

    if (payload.status === 'REJECTED' && !payload.rejectionReason?.trim()) {
      throw new Error('REJECTION_REASON_REQUIRED');
    }

    const next = {
      status: payload.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      rejection_reason: payload.status === 'REJECTED' ? payload.rejectionReason?.trim() ?? null : null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await this.supabase
      .from('user_verifications')
      .update(next)
      .eq('user_id', targetUserId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await this.supabase.from('admin_audit_log').insert({
      admin_user_id: adminUserId,
      action: 'USER_VERIFICATION_REVIEWED',
      target_user_id: targetUserId,
      before_payload: {
        status: current.data.status,
        reviewedAt: current.data.reviewed_at,
        rejectionReason: current.data.rejection_reason,
      },
      after_payload: {
        status: next.status,
        reviewedAt: next.reviewed_at,
        rejectionReason: next.rejection_reason,
      },
      created_at: new Date().toISOString(),
    });

    return { ok: true };
  }
}
