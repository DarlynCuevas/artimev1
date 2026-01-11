import Stripe from 'stripe';
import { stripe } from './stripe.client';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';

import { StripeOnboardingStatus } from '../../modules/payments/stripe/stripe-onboarding-status.enum';
import type { ArtistRepository } from 'src/modules/artists/repositories/artist.repository.interface';
import { Inject } from '@nestjs/common';
import { ARTIST_REPOSITORY } from 'src/modules/artists/repositories/artist-repository.token';

@Injectable()
export class StripeWebhookService {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
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
}
