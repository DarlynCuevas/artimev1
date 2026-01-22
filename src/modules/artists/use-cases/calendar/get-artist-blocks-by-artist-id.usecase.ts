import { Injectable } from '@nestjs/common';
import { ArtistCalendarBlockRepository } from '@/src/infrastructure/database/repositories/artist/artist-calendar-block.repository';

@Injectable()
export class GetArtistBlocksByArtistIdUseCase {
  constructor(private readonly blockRepo: ArtistCalendarBlockRepository) {}

  async execute(artistId: string, from: string, to: string) {
    const { data, error } = await this.blockRepo.findByArtistBetween(artistId, from, to);
    if (error) {
      throw error;
    }
    return data ?? [];
  }
}