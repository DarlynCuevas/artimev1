
import { Injectable } from '@nestjs/common';
import type { ArtistRepository } from '../../../../modules/artists/repositories/artist.repository.interface';
import { Artist } from '../../../../modules/artists/entities/artist.entity';
import { StripeOnboardingStatus } from '../../../../modules/payments/stripe/stripe-onboarding-status.enum';
import { supabase } from '../../supabase.client';

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

  async findAvailableForDate(filters: {
    date: string
    city?: string
    genre?: string
    minPrice?: number
    maxPrice?: number
    search?: string
  }) {
    const { date, city, genre, minPrice, maxPrice, search } = filters

    let query = supabase
      .from('artists')
      .select(`
      id,
      name,
      city,
      genres,
      base_price,
      currency,
      is_negotiable,
      rating
    `)

    // Filtros reales
    if (city) query = query.eq('city', city)
    if (genre) query = query.contains('genres', [genre])
    if (minPrice !== undefined) query = query.gte('base_price', minPrice)
    if (maxPrice !== undefined) query = query.lte('base_price', maxPrice)
    if (search) query = query.ilike('name', `%${search}%`)

    // Excluir artistas NO disponibles en esa fecha
    const { data: blocked } = await supabase
      .from('bookings')
      .select('artist_id')
      .eq('start_date', date)
      .in('status', [
        'ACCEPTED',
        'CONTRACT_SIGNED',
        'PAID_PARTIAL',
        'PAID_FULL',
      ])

    if (blocked && blocked.length > 0) {
      query = query.not(
        'id',
        'in',
        `(${blocked.map((b) => b.artist_id).join(',')})`,
      )
    }

    const { data, error } = await query
    if (error) throw error

    return data.map((a) => ({
      artistId: a.id,
      name: a.name,
      city: a.city,
      genres: a.genres,
      basePrice: a.base_price,
      currency: a.currency,
      isNegotiable: a.is_negotiable,
      rating: a.rating,
    }))
  }


  async findPublicProfileById(id: string) {
    const { data, error } = await supabase
      .from('artists')
      .select(`
      id,
      name,
      city,
      genres,
      base_price,
      currency,
      is_negotiable,
      rating
    `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      name: data.name,
      city: data.city,
      genres: data.genres ?? [],
      basePrice: data.base_price,
      currency: data.currency,
      isNegotiable: data.is_negotiable,
      rating: data.rating ?? undefined,
    }
  }

async findForDiscover() {
  // ...
  
  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      city,
      genres,
      base_price,
      currency,
      rating
    `)
    .order('rating', { ascending: false })
    .limit(50);

    // ...
    

  if (error) throw error;
  return data;
}



}