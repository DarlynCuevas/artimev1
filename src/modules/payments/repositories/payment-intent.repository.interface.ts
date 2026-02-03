export interface PaymentIntentRecord {
  id: string;
  provider: string;
  bookingId: string;
  milestoneId?: string | null;
  amount: number;
  currency: string;
  status: string;
  providerPaymentId?: string | null;
  clientSecret?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, any> | null;
  error?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface PaymentIntentRepository {
  findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PaymentIntentRecord | null>;

  findByProviderPaymentId(
    providerPaymentId: string,
  ): Promise<PaymentIntentRecord | null>;

  save(input: {
    provider: string;
    bookingId: string;
    milestoneId?: string | null;
    amount: number;
    currency: string;
    status: string;
    providerPaymentId?: string | null;
    clientSecret?: string | null;
    idempotencyKey: string;
    metadata?: Record<string, any> | null;
    error?: string | null;
  }): Promise<PaymentIntentRecord>;

  updateByIdempotencyKey(
    idempotencyKey: string,
    patch: {
      status?: string;
      providerPaymentId?: string | null;
      clientSecret?: string | null;
      error?: string | null;
      metadata?: Record<string, any> | null;
    },
  ): Promise<void>;

  updateByProviderPaymentId(
    providerPaymentId: string,
    patch: {
      status?: string;
      clientSecret?: string | null;
      error?: string | null;
      metadata?: Record<string, any> | null;
    },
  ): Promise<void>;
}
