import { Inject } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../../../artists/repositories/artist-repository.token';
import type { ArtistRepository } from '../../../artists/repositories/artist.repository.interface';
import { StripeOnboardingStatus } from '../../stripe/stripe-onboarding-status.enum';
import { StripeConnectService } from '../../../../infrastructure/payments/stripe-connect.service';

interface CreateStripeAccountInput {
  artistId: string;
}

interface CreateStripeAccountOutput {
  onboardingUrl: string;
}

export class CreateStripeAccountUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
    private readonly stripeConnectService: StripeConnectService,
  ) {}

  async execute(
    input: CreateStripeAccountInput,
  ): Promise<CreateStripeAccountOutput> {
    const artist = await this.artistRepository.findById(input.artistId);

    if (!artist) {
      throw new Error('Artist not found');
    }

    if (artist.stripeAccountId) {
      throw new Error('Stripe account already exists for artist');
    }

    // 1️ Create Stripe Express Account
    const account = await this.stripeConnectService.createExpressAccount(
      artist.email,
    );

    // 2️ Persist Stripe data
    artist.setStripeAccount({
      stripeAccountId: account.id,
      onboardingStatus: StripeOnboardingStatus.PENDING,
    });

    await this.artistRepository.update(artist);

    // 3️ Create onboarding link
    const onboardingLink =
      await this.stripeConnectService.createOnboardingLink(account.id);

    return {
      onboardingUrl: onboardingLink.url,
    };
  }
}
