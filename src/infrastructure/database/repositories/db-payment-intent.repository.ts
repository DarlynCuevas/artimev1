import { supabase } from '../supabase.client';
import type {
  PaymentIntentRecord,
  PaymentIntentRepository,
} from '../../../modules/payments/repositories/payment-intent.repository.interface';

export class DbPaymentIntentRepository
  implements PaymentIntentRepository
{
  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PaymentIntentRecord | null> {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToRecord(data);
  }

  async findByProviderPaymentId(
    providerPaymentId: string,
  ): Promise<PaymentIntentRecord | null> {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('provider_payment_id', providerPaymentId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToRecord(data);
  }

  async save(input: {
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
  }): Promise<PaymentIntentRecord> {
    const { data, error } = await supabase
      .from('payment_intents')
      .upsert(
        {
          provider: input.provider,
          booking_id: input.bookingId,
          milestone_id: input.milestoneId ?? null,
          amount: input.amount,
          currency: input.currency,
          status: input.status,
          provider_payment_id: input.providerPaymentId ?? null,
          client_secret: input.clientSecret ?? null,
          idempotency_key: input.idempotencyKey,
          metadata: input.metadata ?? null,
          error: input.error ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'idempotency_key' },
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(
        `SAVE_PAYMENT_INTENT_FAILED: ${error?.message ?? 'no data'}`,
      );
    }

    return this.mapRowToRecord(data);
  }

  async updateByIdempotencyKey(
    idempotencyKey: string,
    patch: {
      status?: string;
      providerPaymentId?: string | null;
      clientSecret?: string | null;
      error?: string | null;
      metadata?: Record<string, any> | null;
    },
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_intents')
      .update({
        status: patch.status,
        provider_payment_id: patch.providerPaymentId ?? undefined,
        client_secret: patch.clientSecret ?? undefined,
        error: patch.error ?? undefined,
        metadata: patch.metadata ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('idempotency_key', idempotencyKey);

    if (error) {
      throw new Error(
        `UPDATE_PAYMENT_INTENT_FAILED: ${error.message}`,
      );
    }
  }

  async updateByProviderPaymentId(
    providerPaymentId: string,
    patch: {
      status?: string;
      clientSecret?: string | null;
      error?: string | null;
      metadata?: Record<string, any> | null;
    },
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_intents')
      .update({
        status: patch.status,
        client_secret: patch.clientSecret ?? undefined,
        error: patch.error ?? undefined,
        metadata: patch.metadata ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_payment_id', providerPaymentId);

    if (error) {
      throw new Error(
        `UPDATE_PAYMENT_INTENT_FAILED: ${error.message}`,
      );
    }
  }

  private mapRowToRecord(row: any): PaymentIntentRecord {
    return {
      id: row.id,
      provider: row.provider,
      bookingId: row.booking_id,
      milestoneId: row.milestone_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      providerPaymentId: row.provider_payment_id ?? null,
      clientSecret: row.client_secret ?? null,
      idempotencyKey: row.idempotency_key,
      metadata: row.metadata ?? null,
      error: row.error ?? null,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    };
  }
}
