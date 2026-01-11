import { Injectable } from '@nestjs/common';
import type { ArtistRepository } from '../../../modules/artists/repositories/artist.repository.interface';
import { Artist } from '../../../modules/artists/entities/artist.entity';
import { StripeOnboardingStatus } from '../../../modules/payments/stripe/stripe-onboarding-status.enum';

@Injectable()
export class DbArtistRepository implements ArtistRepository {
  async findById(id: string): Promise<Artist | null> {
    // Stub temporal
    return new Artist({
      id,
      email: 'artist@test.com',
      stripeOnboardingStatus: StripeOnboardingStatus.NOT_STARTED,
    });
  }

  async update(): Promise<void> {
    return;
  }
}
