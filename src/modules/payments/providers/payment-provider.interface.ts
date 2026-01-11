export interface PaymentProvider {
  createPaymentIntent(input: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<{
    providerPaymentId: string;
    clientSecret: string;
  }>;

  refundPayment(input: {
    providerPaymentId: string;
    amount?: number;
  }): Promise<void>;
  createPayout(input: {
    amount: number;
    currency: string;
    destinationAccountId: string;
  }): Promise<void>;
}
