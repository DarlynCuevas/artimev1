import { Inject, Injectable } from '@nestjs/common';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '../repositories/artist-manager-representation.repository.token';
import type { ArtistManagerRepresentationRepository } from '../repositories/artist-manager-representation.repository.interface';
import { ARTIST_REPOSITORY } from '@/src/modules/artists/repositories/artist-repository.token';
import type { ArtistRepository } from '@/src/modules/artists/repositories/artist.repository.interface';

@Injectable()
export class GetManagerRepresentedArtistsUseCase {
  constructor(
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly representationRepository: ArtistManagerRepresentationRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
  ) {}

  async execute(managerId: string) {
    const reps = await this.representationRepository.findActiveByManager(managerId);
    if (!reps || reps.length === 0) return [];

    const artistIds = reps.map((r) => r.artistId);
    const artists = await this.artistRepository.findByIds(artistIds);

    const byId = new Map(artists.map((a) => [a.id, a]));

    return reps
      .map((rep) => {
        const artist = byId.get(rep.artistId);
        if (!artist) return null;
        return {
          id: artist.id,
          name: (artist as any).name ?? 'Artista',
          avatar: null,
          status: 'ACTIVE' as const,
          nextShow: null,
          activeBookings: 0,
        };
      })
      .filter(Boolean);
  }
}
