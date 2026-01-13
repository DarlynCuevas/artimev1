import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { stripe } from './stripe.client';
import { StripeTransferRole } from './stripe-transfer-role.enum';

@Injectable()
export class StripeTransferProvider {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = stripe;
  }

  async transferToArtist(params: {
    artistStripeAccountId: string | null;
    amountCents: number;
    currency: string;
    bookingId: string;
  }): Promise<void> {
    const {
      artistStripeAccountId,
      amountCents,
      currency,
      bookingId,
    } = params;

    if (!artistStripeAccountId) {
      throw new Error('Artist has no connected Stripe account');
    }

    await this.stripe.transfers.create({
      amount: amountCents,
      currency,
      destination: artistStripeAccountId,
      metadata: {
        bookingId,
        role: StripeTransferRole.ARTIST,
      },
    });
  }

  async transferToManager(params: {
    managerStripeAccountId: string | null;
    amountCents: number;
    currency: string;
    bookingId: string;
  }): Promise<void> {
    const {
      managerStripeAccountId,
      amountCents,
      currency,
      bookingId,
    } = params;

    if (!managerStripeAccountId) {
      throw new Error('Manager has no connected Stripe account');
    }

    await this.stripe.transfers.create({
      amount: amountCents,
      currency,
      destination: managerStripeAccountId,
      metadata: {
        bookingId,
        role: StripeTransferRole.MANAGER,
      },
    });
  }
}
