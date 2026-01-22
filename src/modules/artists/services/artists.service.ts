import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../repositories/artist-repository.token';
import type { ArtistRepository } from '../repositories/artist.repository.interface';
import { supabase } from 'src/infrastructure/database/supabase.client';
import { SupabaseClient } from '@supabase/supabase-js';
import { ArtistProps } from '../entities/artist.entity';
import { CreateArtistDto } from '../dto/create-artist.dto';
import { ArtistFormat } from '../enums/artist-format.enum';
import { buildDayRange } from '../utils/build-day-range';
import { GetArtistDashboardUseCase } from '../use-cases/dashboard-artist.usecase';
import { UpdateArtistDto } from '../dto/update-artist.dto';


@Injectable()
export class ArtistsService {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
    private readonly getArtistDashboardUseCase: GetArtistDashboardUseCase,
  ) { }

  async findAll() {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findByUserId(userId: string) {
  return this.artistRepository.findByUserId(userId);
}


  async getPublicArtistProfile(artistId: string): Promise<CreateArtistDto> {
    const artist = await this.artistRepository.findPublicProfileById(artistId);

    if (!artist) {
      throw new NotFoundException('ARTIST_NOT_FOUND');
    }

    return {
      name: artist.name,
      city: artist.city,
      genres: artist.genres,
      bio: artist.bio ?? '',
      format: artist.format as ArtistFormat,
      basePrice: artist.basePrice,
      currency: artist.currency,
      isNegotiable: artist.isNegotiable,
      managerId: artist.managerId,
      rating: artist.rating,
    };
  }


  async discover() {

    return this.artistRepository.findForDiscover();
  }

  async updateArtistProfile(artistId: string, dto: UpdateArtistDto) {
    await this.artistRepository.updateProfile(artistId, {
      name: dto.name,
      city: dto.city,
      genres: dto.genres,
      bio: dto.bio,
      format: dto.format,
      basePrice: dto.basePrice,
      currency: dto.currency,
      isNegotiable: dto.isNegotiable,
      managerId: dto.managerId ?? null,
      rating: dto.rating,
    });

    return this.getPublicArtistProfile(artistId);
  }

  async getArtistDashboard(artistId: string) {
    return this.getArtistDashboardUseCase.execute(artistId);
  }

  private assertArtistIsComplete(artist: ArtistProps) {
    if (
      !artist.name ||
      !artist.city ||
      !artist.genres?.length ||
      !artist.format ||
      artist.basePrice === null ||
      artist.basePrice === undefined ||
      !artist.currency ||
      artist.isNegotiable === undefined
    ) {
      throw new Error('Artist profile is incomplete');
    }
  }

  async getAvailability(
    artistId: string,
    from: string,
    to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException(
        'INVALID_DATE_RANGE: from and to are required',
      );
    }

    const bookedDates =
      await this.artistRepository.findBookedDates(
        artistId,
        from,
        to,
      );

    const days = buildDayRange(from, to).map(date => ({
      date,
      status: bookedDates.includes(date)
        ? 'BOOKED'
        : 'AVAILABLE',
    }));

    return {
      artistId,
      from,
      to,
      days,
    };
  }

}