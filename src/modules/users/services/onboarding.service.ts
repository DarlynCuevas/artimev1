import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';

@Injectable()
export class OnboardingService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  private async ensureUserProfile(params: {
    userId: string;
    role: 'ARTIST' | 'VENUE' | 'PROMOTER' | 'MANAGER';
    displayName: string;
    email?: string | null;
  }) {
    const { userId, role, displayName, email } = params;
    const { error } = await this.supabase
      .from('users')
      .upsert(
        {
          id: userId,
          role,
          display_name: displayName,
          email: email ?? null,
        },
        { onConflict: 'id' },
      );

    if (error) {
      throw new Error(error.message);
    }
  }

  async createArtistProfile(params: {
    userId: string;
    email?: string | null;
    name: string;
    city: string;
    genres: string[];
    basePrice: number;
    isNegotiable: boolean;
  }) {
    const { userId, email, name, city, genres, basePrice, isNegotiable } = params;
    if (!name || !city || !genres?.length || basePrice === undefined || basePrice === null) {
      throw new BadRequestException('MISSING_FIELDS');
    }

    await this.ensureUserProfile({
      userId,
      role: 'ARTIST',
      displayName: name,
      email: email ?? null,
    });

    const { data: existing } = await this.supabase
      .from('artists')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await this.supabase
        .from('artists')
        .update({
          name,
          city,
          genres,
          base_price: basePrice,
          is_negotiable: isNegotiable,
          email: email ?? null,
          updated_at: new Date(),
        })
        .eq('id', existing.id);

      if (error) throw new Error(error.message);
      return { id: existing.id };
    }

    const { data, error } = await this.supabase
      .from('artists')
      .insert({
        id: userId,
        user_id: userId,
        name,
        city,
        genres,
        base_price: basePrice,
        is_negotiable: isNegotiable,
        email: email ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return { id: data.id };
  }

  async createVenueProfile(params: {
    userId: string;
    email?: string | null;
    name: string;
    city: string;
    capacity?: number | null;
    address?: string | null;
  }) {
    const { userId, email, name, city, capacity, address } = params;
    if (!name || !city) {
      throw new BadRequestException('MISSING_FIELDS');
    }

    await this.ensureUserProfile({
      userId,
      role: 'VENUE',
      displayName: name,
      email: email ?? null,
    });

    const { data: existing } = await this.supabase
      .from('venues')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await this.supabase
        .from('venues')
        .update({
          name,
          city,
          capacity: capacity ?? null,
          address: address ?? null,
          updated_at: new Date(),
        })
        .eq('id', existing.id);

      if (error) throw new Error(error.message);
      return { id: existing.id };
    }

    const { data, error } = await this.supabase
      .from('venues')
      .insert({
        user_id: userId,
        name,
        city,
        capacity: capacity ?? null,
        address: address ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return { id: data.id };
  }

  async createPromoterProfile(params: {
    userId: string;
    email?: string | null;
    name: string;
    city: string;
  }) {
    const { userId, email, name, city } = params;
    if (!name || !city) {
      throw new BadRequestException('MISSING_FIELDS');
    }

    await this.ensureUserProfile({
      userId,
      role: 'PROMOTER',
      displayName: name,
      email: email ?? null,
    });

    const { data: existing } = await this.supabase
      .from('promoters')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await this.supabase
        .from('promoters')
        .update({
          name,
          city,
          updated_at: new Date(),
        })
        .eq('id', existing.id);

      if (error) throw new Error(error.message);
      return { id: existing.id };
    }

    const { data, error } = await this.supabase
      .from('promoters')
      .insert({
        user_id: userId,
        name,
        city,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return { id: data.id };
  }

  async createManagerProfile(params: {
    userId: string;
    name: string;
    email?: string | null;
  }) {
    const { userId, name, email } = params;
    if (!name) {
      throw new BadRequestException('MISSING_FIELDS');
    }

    await this.ensureUserProfile({
      userId,
      role: 'MANAGER',
      displayName: name,
      email: email ?? null,
    });

    const { data: existing } = await this.supabase
      .from('managers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await this.supabase
        .from('managers')
        .update({
          name,
          email: email ?? null,
        })
        .eq('id', existing.id);

      if (error) throw new Error(error.message);
      return { id: existing.id };
    }

    const { data, error } = await this.supabase
      .from('managers')
      .insert({
        user_id: userId,
        name,
        email: email ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return { id: data.id };
  }
}
