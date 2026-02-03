export interface PaymentProvider {
  /* =======================
     PAYMENT INTENTS
     ======================= */

  createPaymentIntent(input: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    idempotencyKey?: string;
  }): Promise<{
    providerPaymentId: string;
    clientSecret: string;
    status: string;
  }>;

  retrievePaymentIntent(paymentIntentId: string): Promise<any>; // Stripe PaymentIntent u objeto nativo

  /* =======================
     REFUNDS
     ======================= */

  refundPayment(input: {
    providerPaymentId: string;
    amount?: number;
  }): Promise<void>;

  /* =======================
     PAYOUTS
     ======================= */

  createPayout(input: {
    amount: number;
    currency: string;
    destinationAccountId: string;
    idempotencyKey?: string;
  }): Promise<void>;
}
