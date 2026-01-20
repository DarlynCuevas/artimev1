
import { Injectable, Inject } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../repositories/artist-repository.token';
import type { ArtistRepository } from '../repositories/artist.repository.interface';

@Injectable()
export class DiscoverArtistsUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
  ) {}

  async execute() {
    return this.artistRepository.findForDiscover();
  }
}
