import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';
import { StripeConnectService } from '@/src/infrastructure/payments/stripe-connect.service';
import { StripeOnboardingStatus } from '../../stripe/stripe-onboarding-status.enum';

type StripeRole = 'ARTIST' | 'VENUE' | 'PROMOTER' | 'MANAGER';

type Input = {
  role: StripeRole;
  profileId: string;
  userId: string;
  userEmail?: string | null;
};

type Output = {
  onboardingUrl: string;
};

type StripeProfileRow = {
  id: string;
  user_id: string;
  stripe_account_id?: string | null;
  email?: string | null;
  contact_email?: string | null;
};

@Injectable()
export class StartStripeOnboardingUseCase {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly stripeConnectService: StripeConnectService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const map = this.resolveTable(input.role);

    const { data, error } = await this.supabase
      .from(map.table)
      .select(map.selectColumns)
      .eq('id', input.profileId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('PROFILE_NOT_FOUND');
    }

    const row = data as unknown as StripeProfileRow;

    if (row.user_id !== input.userId) {
      throw new ForbiddenException('PROFILE_ACCESS_DENIED');
    }

    if (row.stripe_account_id) {
      const onboardingLink = await this.stripeConnectService.createOnboardingLink(row.stripe_account_id);
      return { onboardingUrl: onboardingLink.url };
    }

    const account = await this.stripeConnectService.createExpressAccount(
      map.resolveEmail(row, input.userEmail),
    );

    const updatePayload: Record<string, unknown> = {
      stripe_account_id: account.id,
      stripe_onboarding_status: StripeOnboardingStatus.PENDING,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await this.supabase
      .from(map.table)
      .update(updatePayload)
      .eq('id', input.profileId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const onboardingLink = await this.stripeConnectService.createOnboardingLink(account.id);
    return { onboardingUrl: onboardingLink.url };
  }

  private resolveTable(role: StripeRole): {
    table: string;
    selectColumns: string;
    resolveEmail: (row: StripeProfileRow, userEmail?: string | null) => string | null | undefined;
  } {
    switch (role) {
      case 'ARTIST':
        return {
          table: 'artists',
          selectColumns: 'id,user_id,email,stripe_account_id',
          resolveEmail: (row, userEmail) => row.email ?? userEmail,
        };
      case 'VENUE':
        return {
          table: 'venues',
          selectColumns: 'id,user_id,contact_email,stripe_account_id',
          resolveEmail: (row, userEmail) => row.contact_email ?? userEmail,
        };
      case 'PROMOTER':
        return {
          table: 'promoters',
          selectColumns: 'id,user_id,stripe_account_id',
          resolveEmail: (_row, userEmail) => userEmail,
        };
      case 'MANAGER':
        return {
          table: 'managers',
          selectColumns: 'id,user_id,email,stripe_account_id',
          resolveEmail: (row, userEmail) => row.email ?? userEmail,
        };
      default:
        throw new NotFoundException('UNSUPPORTED_ROLE');
    }
  }
}
