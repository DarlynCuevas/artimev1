import { CreateStripeAccountUseCase } from './create-stripe-account.use-case';
import { StripeOnboardingStatus } from '../../stripe/stripe-onboarding-status.enum';
import { Artist } from '../../../artists/entities/artist.entity';

describe('CreateStripeAccountUseCase', () => {
  it('creates a Stripe Express account and returns onboarding URL', async () => {
    // Arrange
    const artist = new Artist({
      id: 'artist-1',
      email: 'artist@test.com',
      stripeOnboardingStatus: StripeOnboardingStatus.NOT_STARTED,
    });

    const artistRepository = {
      findById: jest.fn().mockResolvedValue(artist),
      update: jest.fn(),
    };

    const stripeConnectService = {
      createExpressAccount: jest.fn().mockResolvedValue({
        id: 'acct_test_123',
      }),
      createOnboardingLink: jest.fn().mockResolvedValue({
        url: 'https://stripe.com/onboarding/test',
      }),
    };

    const useCase = new CreateStripeAccountUseCase(
      artistRepository as any,
      stripeConnectService as any,
    );

    // Act
    const result = await useCase.execute({ artistId: 'artist-1' });

    // Assert
    expect(stripeConnectService.createExpressAccount).toHaveBeenCalledWith(
      'artist@test.com',
    );

    expect(artistRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeAccountId: 'acct_test_123',
      }),
    );

    expect(artist.stripeOnboardingStatus).toBe(
      StripeOnboardingStatus.PENDING,
    );

    expect(result.onboardingUrl).toBe(
      'https://stripe.com/onboarding/test',
    );
  });

  it('throws error if artist already has Stripe account', async () => {
    const artist = new Artist({
      id: 'artist-1',
      email: 'artist@test.com',
      stripeAccountId: 'acct_existing',
      stripeOnboardingStatus: StripeOnboardingStatus.COMPLETED,
    });

    const artistRepository = {
      findById: jest.fn().mockResolvedValue(artist),
      update: jest.fn(),
    };

    const stripeConnectService = {
      createExpressAccount: jest.fn(),
      createOnboardingLink: jest.fn(),
    };

    const useCase = new CreateStripeAccountUseCase(
      artistRepository as any,
      stripeConnectService as any,
    );

    await expect(
      useCase.execute({ artistId: 'artist-1' }),
    ).rejects.toThrow('Stripe account already exists');

    expect(stripeConnectService.createExpressAccount).not.toHaveBeenCalled();
  });
});
