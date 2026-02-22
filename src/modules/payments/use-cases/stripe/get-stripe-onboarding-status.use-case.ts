import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';
import { StripeOnboardingStatus } from '../../stripe/stripe-onboarding-status.enum';

type StripeRole = 'ARTIST' | 'VENUE' | 'PROMOTER' | 'MANAGER';

type Input = {
  role: StripeRole;
  profileId: string;
  userId: string;
};

type Output = {
  role: StripeRole;
  profileId: string;
  stripeAccountId: string | null;
  onboardingStatus: StripeOnboardingStatus;
  isConnected: boolean;
};

type StripeProfileRow = {
  id: string;
  user_id: string;
  stripe_account_id?: string | null;
  stripe_onboarding_status?: StripeOnboardingStatus | null;
};

@Injectable()
export class GetStripeOnboardingStatusUseCase {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async execute(input: Input): Promise<Output> {
    const table = this.resolveTable(input.role);

    const { data, error } = await this.supabase
      .from(table)
      .select('id,user_id,stripe_account_id,stripe_onboarding_status')
      .eq('id', input.profileId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('PROFILE_NOT_FOUND');
    }

    const row = data as unknown as StripeProfileRow;
    if (row.user_id !== input.userId) {
      throw new ForbiddenException('PROFILE_ACCESS_DENIED');
    }

    const onboardingStatus = row.stripe_onboarding_status ?? StripeOnboardingStatus.NOT_STARTED;
    return {
      role: input.role,
      profileId: input.profileId,
      stripeAccountId: row.stripe_account_id ?? null,
      onboardingStatus,
      isConnected: Boolean(row.stripe_account_id),
    };
  }

  private resolveTable(role: StripeRole): string {
    switch (role) {
      case 'ARTIST':
        return 'artists';
      case 'VENUE':
        return 'venues';
      case 'PROMOTER':
        return 'promoters';
      case 'MANAGER':
        return 'managers';
      default:
        throw new NotFoundException('UNSUPPORTED_ROLE');
    }
  }
}

