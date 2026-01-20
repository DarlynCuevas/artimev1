import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../repositories/artist-repository.token';
import type { ArtistRepository } from '../repositories/artist.repository.interface';
import { supabase } from 'src/infrastructure/database/supabase.client';
import { SupabaseClient } from '@supabase/supabase-js';


@Injectable()
export class ArtistsService {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
  ) {}

  async findAll() {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getPublicArtistProfile(artistId: string) {
  const artist = await this.artistRepository.findPublicProfileById(artistId)

  if (!artist) {
    throw new NotFoundException('ARTIST_NOT_FOUND')
  }

  return {
    id: artist.id,
    name: artist.name,
    city: artist.city,
    genres: artist.genres ?? [],
    bio: artist.bio ?? null,
    basePrice: artist.basePrice,
    currency: artist.currency,
    isNegotiable: artist.isNegotiable,
    rating: artist.rating,
  }
}

async discover() {
  
  return this.artistRepository.findForDiscover();
}

}