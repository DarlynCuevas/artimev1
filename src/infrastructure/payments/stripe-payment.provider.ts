import Stripe from 'stripe';
import { PaymentProvider } from '../../modules/payments/providers/payment-provider.interface';

export class StripePaymentProvider implements PaymentProvider {
    async createPayout(input: {
      amount: number;
      currency: string;
      destinationAccountId: string;
    }): Promise<void> {
      await this.stripe.transfers.create({
        amount: input.amount,
        currency: input.currency,
        destination: input.destinationAccountId,
      });
    }
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createPaymentIntent(input: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }) {
    const intent = await this.stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency,
      metadata: input.metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      providerPaymentId: intent.id,
      clientSecret: intent.client_secret!,
    };
  }

  async refundPayment(input: {
    providerPaymentId: string;
    amount?: number;
  }): Promise<void> {
    await this.stripe.refunds.create({
      payment_intent: input.providerPaymentId,
      amount: input.amount,
    });
  }
}
