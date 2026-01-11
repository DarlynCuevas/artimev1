import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentProvider } from '../../modules/payments/providers/payment-provider.interface';

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  private stripe?: Stripe;

  private getStripe(): Stripe {
    if (!this.stripe) {
      const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2025-12-15.clover',
      });
    }
    return this.stripe;
  }

  async createPayout(input: {
    amount: number;
    currency: string;
    destinationAccountId: string;
  }): Promise<void> {
    const stripe = this.getStripe();
    await stripe.transfers.create({
      amount: input.amount,
      currency: input.currency,
      destination: input.destinationAccountId,
    });
  }

  async createPaymentIntent(input: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }) {
    const stripe = this.getStripe();
    const intent = await stripe.paymentIntents.create({
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
    const stripe = this.getStripe();
    await stripe.refunds.create({
      payment_intent: input.providerPaymentId,
      amount: input.amount,
    });
  }
}
