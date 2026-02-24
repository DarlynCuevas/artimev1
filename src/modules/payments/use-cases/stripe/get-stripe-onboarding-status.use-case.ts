import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';
import { StripeOnboardingStatus } from '../../stripe/stripe-onboarding-status.enum';
import { StripeConnectService } from '@/src/infrastructure/payments/stripe-connect.service';

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
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly stripeConnectService: StripeConnectService,
  ) {}

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

    let onboardingStatus = row.stripe_onboarding_status ?? StripeOnboardingStatus.NOT_STARTED;
    const stripeAccountId = row.stripe_account_id ?? null;

    if (stripeAccountId && onboardingStatus !== StripeOnboardingStatus.COMPLETED) {
      const account = await this.stripeConnectService.getAccount(stripeAccountId);
      const realStatus = this.stripeConnectService.resolveOnboardingStatus(account);

      if (realStatus !== onboardingStatus) {
        onboardingStatus = realStatus;
        const patch: Record<string, unknown> = {
          stripe_onboarding_status: realStatus,
          updated_at: new Date().toISOString(),
        };
        if (realStatus === StripeOnboardingStatus.COMPLETED) {
          patch.stripe_connected_at = new Date().toISOString();
        }
        await this.supabase
          .from(table)
          .update(patch)
          .eq('id', input.profileId);
      }
    }

    return {
      role: input.role,
      profileId: input.profileId,
      stripeAccountId,
      onboardingStatus,
      isConnected: Boolean(stripeAccountId),
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
