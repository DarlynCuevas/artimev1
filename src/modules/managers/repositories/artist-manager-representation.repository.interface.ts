// src/modules/managers/repositories/artist-manager-representation.repository.interface.ts

import { ArtistManagerRepresentation } from '../entities/artist-manager-representation.entity';

export interface ArtistManagerRepresentationRepository {
  findActiveByArtist(
    artistId: string,
    at?: Date,
  ): Promise<ArtistManagerRepresentation | null>;

  findActiveByManager(
    managerId: string,
    at?: Date,
  ): Promise<ArtistManagerRepresentation[]>;

  findLatestVersionByArtist(
    artistId: string,
  ): Promise<ArtistManagerRepresentation | null>;

  findHistoryByArtist(
    artistId: string,
  ): Promise<ArtistManagerRepresentation[]>;

  save(
    representation: ArtistManagerRepresentation,
  ): Promise<void>;

  existsActiveRepresentation(params: {
    artistId: string;
    managerId: string;
  }): Promise<boolean>;
}
