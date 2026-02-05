
import { Injectable } from '@nestjs/common';
import type { ArtistRepository } from '../../../../modules/artists/repositories/artist.repository.interface';
import { Artist } from '../../../../modules/artists/entities/artist.entity';
import { StripeOnboardingStatus } from '../../../../modules/payments/stripe/stripe-onboarding-status.enum';
import { BookingStatus } from '../../../../modules/bookings/booking-status.enum';
import { supabase } from '../../supabase.client';
import { format } from 'path';

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
      stripeOnboardingStatus: data.stripe_onboarding_status,
      name: data.name,
      city: data.city,
      genres: data.genres,
      basePrice: data.base_price,
      currency: data.currency,
      isNegotiable: data.is_negotiable,
      bio: data.bio,
      format: data.format,
      stripeAccountId: data.stripe_account_id,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      rating: data.rating,
      managerId: data.manager_id,
    });
  }

  async findByUserId(userId: string) {
    const { data } = await supabase
      .from('artists')
      .select('*')
      .eq('user_id', userId)
      .single();

    return data ?? null;
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
      stripeOnboardingStatus: data.stripe_onboarding_status,
      name: data.name,
      city: data.city,
      genres: data.genres,
      basePrice: data.base_price,
      currency: data.currency,
      isNegotiable: data.is_negotiable,
      bio: data.bio,
      format: data.format,
      stripeAccountId: data.stripe_account_id,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      rating: data.rating,
      managerId: data.manager_id,
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
      rating,
      bio,
      format
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
        'COMPLETED',
      ])

    const { data: manualBlocks } = await supabase
      .from('artist_calendar_blocks')
      .select('artist_id')
      .eq('date', date)

    if (blocked && blocked.length > 0) {
      query = query.not(
        'id',
        'in',
        `(${blocked.map((b) => b.artist_id).join(',')})`,
      )
    }

    if (manualBlocks && manualBlocks.length > 0) {
      query = query.not(
        'id',
        'in',
        `(${manualBlocks.map((b) => b.artist_id).join(',')})`,
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
            rating,
            bio,
            format,
            manager_id
          `)
      .eq('id', id)
      .maybeSingle();
    // Si data es array, tomar el primer elemento
    const artist = Array.isArray(data) ? data[0] : data;
    if (error || !artist) {
      return null;
    }
    return {
      id: artist.id,
      name: artist.name,
      city: artist.city,
      genres: artist.genres ?? [],
      basePrice: artist.base_price,
      currency: artist.currency,
      isNegotiable: artist.is_negotiable,
      rating: artist.rating ?? undefined,
      bio: artist.bio ?? '',
      format: artist.format ?? '',
      managerId: artist.manager_id ?? undefined,
    };
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

  async findBookedDates(
    artistId: string,
    from: string,
    to: string,
  ): Promise<string[]> {

    if (!from || !to) {
      throw new Error('Parámetros de fecha inválidos: from y to son requeridos');
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('start_date')
      .eq('artist_id', artistId)
      .in('status', [
        BookingStatus.ACCEPTED,
        BookingStatus.CONTRACT_SIGNED,
        BookingStatus.PAID_PARTIAL,
        BookingStatus.PAID_FULL,
        BookingStatus.COMPLETED,
      ])
      .gte('start_date', from)
      .lte('start_date', to);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Normalizamos a YYYY-MM-DD
    return data.map(b => b.start_date.slice(0, 10));
  }
  async findByIds(ids: string[]): Promise<Artist[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .in('id', ids);

  if (error || !data) return [];

  return data.map(
    (row) =>
      new Artist({
        id: row.id,
        email: row.email,
        stripeOnboardingStatus: row.stripe_onboarding_status,
        name: row.name,
        city: row.city,
        genres: row.genres,
        basePrice: row.base_price,
        currency: row.currency,
        isNegotiable: row.is_negotiable,
        bio: row.bio,
        format: row.format,
        stripeAccountId: row.stripe_account_id ?? undefined,
        rating: row.rating ?? undefined,
        managerId: row.manager_id ?? null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }),
  );
}

  async findByManagerId(managerId: string): Promise<Artist[]> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('manager_id', managerId);

    if (error || !data) return [];

    return data.map(
      (row) =>
        new Artist({
          id: row.id,
          email: row.email,
          stripeOnboardingStatus: row.stripe_onboarding_status,
          name: row.name,
          city: row.city,
          genres: row.genres,
          basePrice: row.base_price,
          currency: row.currency,
          isNegotiable: row.is_negotiable,
          bio: row.bio,
          format: row.format,
          stripeAccountId: row.stripe_account_id ?? undefined,
          rating: row.rating ?? undefined,
          managerId: row.manager_id ?? null,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }),
    );
  }


  async updateProfile(
    artistId: string,
    payload: {
      name?: string;
      city?: string;
      genres?: string[];
      bio?: string;
      format?: string;
      basePrice?: number;
      currency?: string;
      isNegotiable?: boolean;
      managerId?: string | null;
      rating?: number;
    },
  ): Promise<void> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date(),
    };

    if (payload.name !== undefined) updatePayload.name = payload.name;
    if (payload.city !== undefined) updatePayload.city = payload.city;
    if (payload.genres !== undefined) updatePayload.genres = payload.genres;
    if (payload.bio !== undefined) updatePayload.bio = payload.bio;
    if (payload.format !== undefined) updatePayload.format = payload.format;
    if (payload.basePrice !== undefined) updatePayload.base_price = payload.basePrice;
    if (payload.currency !== undefined) updatePayload.currency = payload.currency;
    if (payload.isNegotiable !== undefined) updatePayload.is_negotiable = payload.isNegotiable;
    if (payload.managerId !== undefined) updatePayload.manager_id = payload.managerId;
    if (payload.rating !== undefined) updatePayload.rating = payload.rating;

    const { error } = await supabase
      .from('artists')
      .update(updatePayload)
      .eq('id', artistId);

    if (error) {
      throw new Error(error.message);
    }
  }



}