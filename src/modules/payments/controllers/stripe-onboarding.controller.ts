import { Controller, Post, Param } from '@nestjs/common';
import { CreateStripeAccountUseCase } from '../use-cases/stripe/create-stripe-account.use-case';

@Controller('payments/stripe')
export class StripeOnboardingController {
  constructor(
    private readonly createStripeAccountUseCase: CreateStripeAccountUseCase,
  ) {}

  /**
   * Initiates Stripe Connect onboarding for an artist
   */
  @Post('artists/:artistId/onboarding')
  async startArtistOnboarding(
    @Param('artistId') artistId: string,
  ): Promise<{ onboardingUrl: string }> {
    return this.createStripeAccountUseCase.execute({
      artistId,
    });
  }
}
