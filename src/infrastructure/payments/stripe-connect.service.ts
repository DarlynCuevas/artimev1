import { stripe } from './stripe.client';

export class StripeConnectService {
  async createExpressAccount(email?: string | null) {
    return stripe.accounts.create({
      type: 'express',
      ...(email ? { email } : {}),
    });
  }

  async createOnboardingLink(accountId: string) {
    return stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://artime.dev/stripe/refresh',
      return_url: 'https://artime.dev/stripe/return',
      type: 'account_onboarding',
    });
  }
}
