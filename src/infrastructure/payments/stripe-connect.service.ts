import { stripe } from './stripe.client';
import { StripeOnboardingStatus } from '../../modules/payments/stripe/stripe-onboarding-status.enum';

export class StripeConnectService {
  async createExpressAccount(email?: string | null) {
    return stripe.accounts.create({
      type: 'express',
      ...(email ? { email } : {}),
    });
  }

  async getAccount(accountId: string) {
    return stripe.accounts.retrieve(accountId);
  }

  resolveOnboardingStatus(account: {
    details_submitted?: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
  }): StripeOnboardingStatus {
    if (
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled
    ) {
      return StripeOnboardingStatus.COMPLETED;
    }
    if (
      account.details_submitted ||
      account.charges_enabled ||
      account.payouts_enabled
    ) {
      return StripeOnboardingStatus.PENDING;
    }
    return StripeOnboardingStatus.NOT_STARTED;
  }

  async createOnboardingLink(accountId: string) {
    const refreshUrl =
      process.env.STRIPE_CONNECT_REFRESH_URL ||
      'https://artime.dev/stripe/refresh';
    const returnUrl =
      process.env.STRIPE_CONNECT_RETURN_URL ||
      'https://artime.dev/stripe/return';

    return stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }
}
