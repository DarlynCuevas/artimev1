import Stripe from 'stripe';
import { stripe } from './stripe.client';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/supabase.module';

import { StripeOnboardingStatus } from '../../modules/payments/stripe/stripe-onboarding-status.enum';
import { Inject } from '@nestjs/common';

import { PaymentMilestoneStatus } from '../../modules/payments/payment-milestone-status.enum';
import { PAYMENT_MILESTONE_REPOSITORY } from '../../modules/payments/payment-milestone-repository.token';
import type { PaymentMilestoneRepository } from '../../modules/payments/payment-milestone.repository.interface';
import { BOOKING_REPOSITORY } from '../../modules/bookings/repositories/booking-repository.token';
import type { SupabaseBookingRepository } from '../database/repositories/bookings/SupabaseBookingRepository ';
import { BookingStatus } from '../../modules/bookings/booking-status.enum';
import { PAYMENT_INTENT_REPOSITORY } from '../../modules/payments/repositories/payment-intent.repository.token';
import type { PaymentIntentRepository } from '../../modules/payments/repositories/payment-intent.repository.interface';

type WebhookProcessingStatus = 'RECEIVED' | 'PROCESSED' | 'FAILED';
type AccountUpdateResult = {
  previousStatus: StripeOnboardingStatus | null;
  newStatus: StripeOnboardingStatus;
};

@Injectable()
export class StripeWebhookService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    @Inject(PAYMENT_MILESTONE_REPOSITORY)
    private readonly milestoneRepository: PaymentMilestoneRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    @Inject(PAYMENT_INTENT_REPOSITORY)
    private readonly paymentIntentRepository: PaymentIntentRepository,
  ) {}

  async handleWebhook(
    req: Request,
    signature: string,
  ): Promise<void> {
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not set');
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret,
    );

    const accountId = this.extractAccountId(event);
    const alreadyProcessed = await this.wasEventProcessed(event.id);
    if (alreadyProcessed) {
      return;
    }

    await this.upsertWebhookLog({
      eventId: event.id,
      eventType: event.type,
      accountId,
      processingStatus: 'RECEIVED',
      payload: event,
    });

    try {
      let accountUpdateResult: AccountUpdateResult | null = null;

      if (event.type === 'account.updated') {
        accountUpdateResult = await this.handleAccountUpdated(event.data.object as Stripe.Account);
      }
      if (event.type === 'payment_intent.succeeded') {
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
      }
      if (event.type === 'payment_intent.created') {
        await this.handlePaymentIntentCreated(
          event.data.object as Stripe.PaymentIntent,
        );
      }
      if (event.type === 'payment_intent.processing') {
        await this.handlePaymentIntentProcessing(
          event.data.object as Stripe.PaymentIntent,
        );
      }
      if (event.type === 'payment_intent.canceled') {
        await this.handlePaymentIntentCanceled(
          event.data.object as Stripe.PaymentIntent,
        );
      }
      if (event.type === 'payment_intent.payment_failed') {
        await this.handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
      }

      await this.upsertWebhookLog({
        eventId: event.id,
        eventType: event.type,
        accountId,
        processingStatus: 'PROCESSED',
        previousOnboardingStatus: accountUpdateResult?.previousStatus ?? null,
        newOnboardingStatus: accountUpdateResult?.newStatus ?? null,
      });
    } catch (error) {
      await this.upsertWebhookLog({
        eventId: event.id,
        eventType: event.type,
        accountId,
        processingStatus: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown webhook error',
      });
      throw error;
    }
  }

  private async handleAccountUpdated(
    account: Stripe.Account,
  ): Promise<AccountUpdateResult> {
    const previousStatus = await this.getCurrentOnboardingStatusByAccountId(account.id);
    const onboardingStatus = this.resolveOnboardingStatus(account);
    const connectedAt =
      onboardingStatus === StripeOnboardingStatus.COMPLETED
        ? new Date().toISOString()
        : null;

    await Promise.all([
      this.updateStripeStatusByAccountId('artists', account.id, onboardingStatus, connectedAt),
      this.updateStripeStatusByAccountId('venues', account.id, onboardingStatus, connectedAt),
      this.updateStripeStatusByAccountId('promoters', account.id, onboardingStatus, connectedAt),
      this.updateStripeStatusByAccountId('managers', account.id, onboardingStatus, connectedAt),
    ]);

    return {
      previousStatus,
      newStatus: onboardingStatus,
    };
  }

  private resolveOnboardingStatus(account: Stripe.Account): StripeOnboardingStatus {
    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
      return StripeOnboardingStatus.COMPLETED;
    }
    if (account.details_submitted || account.charges_enabled || account.payouts_enabled) {
      return StripeOnboardingStatus.PENDING;
    }
    return StripeOnboardingStatus.NOT_STARTED;
  }

  private async updateStripeStatusByAccountId(
    table: 'artists' | 'venues' | 'promoters' | 'managers',
    stripeAccountId: string,
    onboardingStatus: StripeOnboardingStatus,
    connectedAt: string | null,
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      stripe_onboarding_status: onboardingStatus,
      updated_at: new Date().toISOString(),
    };

    if (connectedAt) {
      updatePayload.stripe_connected_at = connectedAt;
    }

    const { error } = await this.supabase
      .from(table)
      .update(updatePayload)
      .eq('stripe_account_id', stripeAccountId);

    if (error) {
      console.warn(`[StripeWebhook] failed to update ${table} for account ${stripeAccountId}: ${error.message}`);
    }
  }

  private extractAccountId(event: Stripe.Event): string | null {
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      return account.id;
    }
    return typeof event.account === 'string' ? event.account : null;
  }

  private async getCurrentOnboardingStatusByAccountId(
    stripeAccountId: string,
  ): Promise<StripeOnboardingStatus | null> {
    const tables: Array<'artists' | 'venues' | 'promoters' | 'managers'> = [
      'artists',
      'venues',
      'promoters',
      'managers',
    ];

    for (const table of tables) {
      const { data } = await this.supabase
        .from(table)
        .select('stripe_onboarding_status')
        .eq('stripe_account_id', stripeAccountId)
        .maybeSingle();

      const status = data?.stripe_onboarding_status as StripeOnboardingStatus | undefined;
      if (status) {
        return status;
      }
    }

    return null;
  }

  private async wasEventProcessed(eventId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('stripe_webhook_events')
      .select('processing_status')
      .eq('event_id', eventId)
      .maybeSingle();

    return data?.processing_status === 'PROCESSED';
  }

  private async upsertWebhookLog(params: {
    eventId: string;
    eventType: string;
    accountId: string | null;
    processingStatus: WebhookProcessingStatus;
    previousOnboardingStatus?: StripeOnboardingStatus | null;
    newOnboardingStatus?: StripeOnboardingStatus | null;
    errorMessage?: string | null;
    payload?: Stripe.Event;
  }): Promise<void> {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      event_id: params.eventId,
      event_type: params.eventType,
      account_id: params.accountId,
      processing_status: params.processingStatus,
      previous_onboarding_status: params.previousOnboardingStatus ?? null,
      new_onboarding_status: params.newOnboardingStatus ?? null,
      error_message: params.errorMessage ?? null,
      updated_at: now,
      ...(params.processingStatus === 'RECEIVED' ? { received_at: now } : {}),
      ...(params.processingStatus !== 'RECEIVED' ? { processed_at: now } : {}),
      ...(params.payload ? { payload: params.payload } : {}),
    };

    const { error } = await this.supabase
      .from('stripe_webhook_events')
      .upsert(payload, { onConflict: 'event_id' });

    if (error) {
      console.warn(`[StripeWebhook] failed to persist webhook log ${params.eventId}: ${error.message}`);
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { milestoneId, bookingId } = paymentIntent.metadata ?? {};

    if (!milestoneId || !bookingId) {
      console.warn('[Webhook] Falta milestoneId o bookingId en metadata');
      return;
    }

    await this.upsertPaymentIntentFromStripe(paymentIntent);

    // 1️ Load milestone
    const milestone = await this.milestoneRepository.findById(milestoneId);

    if (!milestone) {
      console.warn('[Webhook] No se encontró milestone con id', milestoneId);
      return;
    }

    if (milestone.status === PaymentMilestoneStatus.PAID) {
      // ...existing code...
      return;
    }

    // 2️ Mark milestone as paid
    milestone.markAsPaid(new Date());
    await this.milestoneRepository.update(milestone);

    // 3️ Recalculate booking status
    const booking = await this.supabaseBookingRepository.findById(bookingId);

    if (!booking) {
      console.warn('[Webhook] No se encontró booking con id', bookingId);
      return;
    }

    const milestones = await this.milestoneRepository.findByBookingId(booking.id);

    const paidCount = milestones.filter(
      (m) => m.status === PaymentMilestoneStatus.PAID,
    ).length;

    if (paidCount === milestones.length) {
      booking.markAsPaidFull();
    } else {
      booking.markAsPaidPartial();
    }

    await this.supabaseBookingRepository.update(booking);
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const errorMessage =
      paymentIntent.last_payment_error?.message ??
      paymentIntent.last_payment_error?.code ??
      'Payment failed';

    await this.upsertPaymentIntentFromStripe(
      paymentIntent,
      errorMessage,
    );
  }

  private async handlePaymentIntentCreated(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    await this.upsertPaymentIntentFromStripe(paymentIntent);
  }

  private async handlePaymentIntentProcessing(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    await this.upsertPaymentIntentFromStripe(paymentIntent);
  }

  private async handlePaymentIntentCanceled(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    await this.upsertPaymentIntentFromStripe(paymentIntent);
  }

  private async upsertPaymentIntentFromStripe(
    paymentIntent: Stripe.PaymentIntent,
    errorMessage?: string,
  ): Promise<void> {
    const { milestoneId, bookingId } =
      paymentIntent.metadata ?? {};

    const existing =
      await this.paymentIntentRepository.findByProviderPaymentId(
        paymentIntent.id,
      );

    if (!existing && bookingId) {
      await this.paymentIntentRepository.save({
        provider: 'stripe',
        bookingId,
        milestoneId: milestoneId ?? null,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        providerPaymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret ?? null,
        idempotencyKey: `stripe-${paymentIntent.id}`,
        metadata: paymentIntent.metadata ?? null,
        error: errorMessage ?? null,
      });

      return;
    }

    await this.paymentIntentRepository.updateByProviderPaymentId(
      paymentIntent.id,
      {
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret ?? null,
        metadata: paymentIntent.metadata ?? null,
        error: errorMessage ?? null,
      },
    );
  }
}
