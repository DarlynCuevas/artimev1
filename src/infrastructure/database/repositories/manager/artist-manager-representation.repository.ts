// src/modules/managers/repositories/db-artist-manager-representation.repository.ts

import { Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';


import { ArtistManagerRepresentation } from '@/src/modules/managers/entities/artist-manager-representation.entity';
import { SUPABASE_CLIENT } from '../../supabase.module';
import { ArtistManagerRepresentationRepository } from '@/src/modules/managers/repositories/artist-manager-representation.repository.interface';

export class DbArtistManagerRepresentationRepository
  implements ArtistManagerRepresentationRepository
{
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async findActiveByArtist(
    artistId: string,
    at: Date = new Date(),
  ): Promise<ArtistManagerRepresentation | null> {
    const { data } = await this.supabase
      .from('artist_manager_representations')
      .select('*')
      .eq('artist_id', artistId)
      .lte('starts_at', at.toISOString())
      .or(`ends_at.is.null,ends_at.gt.${at.toISOString()}`)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? this.toEntity(data) : null;
  }

  async findActiveByManager(
    managerId: string,
    at: Date = new Date(),
  ): Promise<ArtistManagerRepresentation[]> {
    const { data } = await this.supabase
      .from('artist_manager_representations')
      .select('*')
      .eq('manager_id', managerId)
      .lte('starts_at', at.toISOString())
      .or(`ends_at.is.null,ends_at.gt.${at.toISOString()}`);

    return (data ?? []).map(this.toEntity);
  }

  async findLatestVersionByArtist(
    artistId: string,
  ): Promise<ArtistManagerRepresentation | null> {
    const { data } = await this.supabase
      .from('artist_manager_representations')
      .select('*')
      .eq('artist_id', artistId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? this.toEntity(data) : null;
  }

  async findHistoryByArtist(
    artistId: string,
  ): Promise<ArtistManagerRepresentation[]> {
    const { data } = await this.supabase
      .from('artist_manager_representations')
      .select('*')
      .eq('artist_id', artistId)
      .order('version', { ascending: false });

    return (data ?? []).map(this.toEntity);
  }

  async save(
    representation: ArtistManagerRepresentation,
  ): Promise<void> {
    await this.supabase
      .from('artist_manager_representations')
      .insert(this.toPersistence(representation));
  }

  // -----------------------
  // MAPPERS
  // -----------------------

  private toEntity(row: any): ArtistManagerRepresentation {
    return new ArtistManagerRepresentation(
      row.id,
      row.artist_id,
      row.manager_id,
      row.commission_percentage,
      new Date(row.starts_at),
      row.ends_at ? new Date(row.ends_at) : null,
      row.termination_requested_at
        ? new Date(row.termination_requested_at)
        : null,
      row.version,
      new Date(row.created_at),
      row.created_by,
      row.ended_by,
    );
  }

  private toPersistence(
    entity: ArtistManagerRepresentation,
  ): Record<string, any> {
    return {
      id: entity.id,
      artist_id: entity.artistId,
      manager_id: entity.managerId,
      commission_percentage: entity.commissionPercentage,
      starts_at: entity.startsAt.toISOString(),
      ends_at: entity.endsAt?.toISOString() ?? null,
      termination_requested_at:
        entity.terminationRequestedAt?.toISOString() ?? null,
      version: entity.version,
      created_at: entity.createdAt.toISOString(),
      created_by: entity.createdBy,
      ended_by: entity.endedBy,
    };
  }

  async existsActiveRepresentation(params: {
  artistId: string;
  managerId: string;
}): Promise<boolean> {
  const { data, error } = await this.supabase
    .from('artist_manager_representations')
    .select('id')
    .eq('artist_id', params.artistId)
    .eq('manager_id', params.managerId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) {
    return false;
  }

  return !!data;
}
}