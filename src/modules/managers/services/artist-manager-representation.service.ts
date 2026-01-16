import { Inject, Injectable } from '@nestjs/common';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '../repositories/artist-manager-representation.repository.token';
import type { ArtistManagerRepresentationRepository } from '../repositories/artist-manager-representation.repository.interface';

@Injectable()
export class ArtistManagerRepresentationService {
  constructor(
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly repository: ArtistManagerRepresentationRepository,
  ) {}
}
