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
    // Fuente principal: artistas con manager_id directo
    const directArtists = await this.artistRepository.findByManagerId(managerId);

    // Fuente secundaria: representaciones activas con histórico
    const reps = await this.representationRepository.findActiveByManager(managerId);
    const representedIds = reps.map((r) => r.artistId);
    const repArtists = representedIds.length ? await this.artistRepository.findByIds(representedIds) : [];

    const combined = [...directArtists, ...repArtists];

    const byId = new Map(combined.map((a) => [a.id, a]));

    return Array.from(byId.values()).map((artist) => ({
      id: artist.id,
      name: (artist as any).name ?? 'Artista',
      avatar: null,
      status: 'ACTIVE' as const,
      nextShow: null,
      activeBookings: 0,
    }));
  }
}
