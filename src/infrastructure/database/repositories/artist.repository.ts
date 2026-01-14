
import { Injectable } from '@nestjs/common';
import type { ArtistRepository } from '../../../modules/artists/repositories/artist.repository.interface';
import { Artist } from '../../../modules/artists/entities/artist.entity';
import { StripeOnboardingStatus } from '../../../modules/payments/stripe/stripe-onboarding-status.enum';
import { supabase } from '../supabase.client';

@Injectable()
export class DbArtistRepository implements ArtistRepository {
  async findById(id: string): Promise<Artist | null> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return new Artist({
      id: data.id,
      email: data.email,
      stripeAccountId: data.stripe_account_id,
      stripeOnboardingStatus: data.stripe_onboarding_status,
    });
  }

  async update(artist: Artist): Promise<void> {
    await supabase
      .from('artists')
      .update({
        stripe_account_id: artist.stripeAccountId,
        stripe_onboarding_status: artist.stripeOnboardingStatus,
      })
      .eq('id', artist.id);
  }

  async findByStripeAccountId(stripeAccountId: string): Promise<Artist | null> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('stripe_account_id', stripeAccountId)
      .single();

    if (error || !data) {
      return null;
    }

    return new Artist({
      id: data.id,
      email: data.email,
      stripeAccountId: data.stripe_account_id,
      stripeOnboardingStatus: data.stripe_onboarding_status,
    });
  }
}
