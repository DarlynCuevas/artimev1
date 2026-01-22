import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../../repositories/artist-repository.token';
import type { ArtistRepository } from '../../repositories/artist.repository.interface';
import { ArtistCalendarBlockRepository } from '@/src/infrastructure/database/repositories/artist/artist-calendar-block.repository';

@Injectable()
export class DeleteArtistCalendarBlockUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepo: ArtistRepository,
    private readonly blockRepo: ArtistCalendarBlockRepository,
  ) {}

  async execute(userId: string, date: string) {
    if (!date) {
      throw new BadRequestException('Date is required');
    }

    const artist = await this.artistRepo.findByUserId(userId);
    if (!artist) {
      throw new BadRequestException('Artist not found');
    }

    const { error } = await this.blockRepo.deleteByArtistAndDate(artist.id, date);
    if (error) {
      throw new BadRequestException(error.message);
    }

    return { success: true };
  }
}
