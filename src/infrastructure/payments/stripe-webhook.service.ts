import Stripe from 'stripe';
import { stripe } from './stripe.client';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';

import { StripeOnboardingStatus } from '../../modules/payments/stripe/stripe-onboarding-status.enum';
import type { ArtistRepository } from 'src/modules/artists/repositories/artist.repository.interface';
import { Inject } from '@nestjs/common';
import { ARTIST_REPOSITORY } from 'src/modules/artists/repositories/artist-repository.token';

import { PaymentMilestoneStatus } from '../../modules/payments/payment-milestone-status.enum';
import { PAYMENT_MILESTONE_REPOSITORY } from '../../modules/payments/payment-milestone-repository.token';
import type { PaymentMilestoneRepository } from '../../modules/payments/payment-milestone.repository.interface';
import { BOOKING_REPOSITORY } from '../../modules/bookings/repositories/booking-repository.token';
import type { SupabaseBookingRepository } from '../database/repositories/bookings/SupabaseBookingRepository ';
import { BookingStatus } from '../../modules/bookings/booking-status.enum';
import { PAYMENT_INTENT_REPOSITORY } from '../../modules/payments/repositories/payment-intent.repository.token';
import type { PaymentIntentRepository } from '../../modules/payments/repositories/payment-intent.repository.interface';

@Injectable()
export class StripeWebhookService {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
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

    if (event.type === 'account.updated') {
      await this.handleAccountUpdated(event.data.object as Stripe.Account);
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
  }

  private async handleAccountUpdated(
    account: Stripe.Account,
  ) {

    if (!account.details_submitted) {
      return;
    }


    const artist =
      await this.artistRepository.findByStripeAccountId(
        account.id,
      );


    if (!artist) {
      return;
    }

    artist.setStripeAccount({
      stripeAccountId: account.id,
      onboardingStatus: StripeOnboardingStatus.COMPLETED,
    });

    await this.artistRepository.update(artist);
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { milestoneId, bookingId } = paymentIntent.metadata ?? {};
    console.log('[Webhook] payment_intent.succeeded metadata:', paymentIntent.metadata);

    if (!milestoneId || !bookingId) {
      console.warn('[Webhook] Falta milestoneId o bookingId en metadata');
      return;
    }

    await this.upsertPaymentIntentFromStripe(paymentIntent);

    // 1️ Load milestone
    const milestone = await this.milestoneRepository.findById(milestoneId);
    console.log('[Webhook] milestone:', milestone);

    if (!milestone) {
      console.warn('[Webhook] No se encontró milestone con id', milestoneId);
      return;
    }

    if (milestone.status === PaymentMilestoneStatus.PAID) {
      console.log('[Webhook] Milestone ya está pagado');
      return;
    }

    // 2️ Mark milestone as paid
    milestone.markAsPaid(new Date());
    console.log('[Webhook] milestone tras markAsPaid:', milestone);

    await this.milestoneRepository.update(milestone);
    console.log('[Webhook] milestone actualizado en BD');

    // 3️ Recalculate booking status
    const booking = await this.supabaseBookingRepository.findById(bookingId);
    console.log('[Webhook] booking:', booking);

    if (!booking) {
      console.warn('[Webhook] No se encontró booking con id', bookingId);
      return;
    }

    const milestones = await this.milestoneRepository.findByBookingId(booking.id);
    console.log('[Webhook] milestones del booking:', milestones);

    const paidCount = milestones.filter(
      (m) => m.status === PaymentMilestoneStatus.PAID,
    ).length;
    console.log('[Webhook] paidCount:', paidCount, 'de', milestones.length);

    if (paidCount === milestones.length) {
      booking.markAsPaidFull();
      console.log('[Webhook] booking marcado como PAID_FULL');
    } else {
      booking.markAsPaidPartial();
      console.log('[Webhook] booking marcado como PAID_PARTIAL');
    }

    await this.supabaseBookingRepository.update(booking);
    console.log('[Webhook] booking actualizado en BD');
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
