import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { UserContext } from '@/src/modules/auth/user-context.guard';
import type { ArtistRepository } from '@/src/modules/artists/repositories/artist.repository.interface';
import { ARTIST_REPOSITORY } from '@/src/modules/artists/repositories/artist-repository.token';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import type { ArtistManagerRepresentationRepository } from '@/src/modules/managers/repositories/artist-manager-representation.repository.interface';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '@/src/modules/managers/repositories/artist-manager-representation.repository.token';
import type { VenueRepository } from '../repositories/venue.repository.interface';
import { VENUE_REPOSITORY } from '../repositories/venue-repository.token';
import { UsersService } from '../../users/services/users.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';

export type VenueSuggestionStatus = 'PENDING' | 'VIEWED' | 'SAVED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

type SuggestionRow = {
  id: string;
  manager_id: string;
  artist_id: string;
  venue_id: string;
  status: VenueSuggestionStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class VenueSuggestionsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly representationRepository: ArtistManagerRepresentationRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
    private readonly usersService: UsersService,
    private readonly notificationsRepo: ArtistNotificationRepository,
  ) {}

  async createSuggestion(
    userContext: UserContext,
    payload: { venueId: string; artistId: string; message?: string | null },
  ) {
    if (!userContext.managerId) {
      throw new ForbiddenException('ONLY_MANAGER');
    }

    if (!payload.venueId || !payload.artistId) {
      throw new BadRequestException('MISSING_FIELDS');
    }

    const hasRepresentation = await this.representationRepository.existsActiveRepresentation({
      managerId: userContext.managerId,
      artistId: payload.artistId,
    });

    if (!hasRepresentation) {
      throw new ForbiddenException('MANAGER_NOT_REPRESENTING_ARTIST');
    }

    const venue = await this.venueRepository.findById(payload.venueId);
    if (!venue) throw new NotFoundException('VENUE_NOT_FOUND');
    if (!venue.userId) throw new BadRequestException('VENUE_HAS_NO_USER');

    const artist = await this.artistRepository.findById(payload.artistId);
    if (!artist) throw new NotFoundException('ARTIST_NOT_FOUND');
    const { data: managerRow } = await this.supabase
      .from('managers')
      .select('name')
      .eq('id', userContext.managerId)
      .maybeSingle();

    const { data: existing, error: existingError } = await this.supabase
      .from('venue_artist_suggestions')
      .select('id')
      .eq('venue_id', payload.venueId)
      .eq('artist_id', payload.artistId)
      .in('status', ['PENDING', 'SAVED', 'VIEWED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw new BadRequestException(existingError.message);
    if (existing?.id) throw new BadRequestException('SUGGESTION_ALREADY_PENDING');

    const id = randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      manager_id: userContext.managerId,
      artist_id: payload.artistId,
      venue_id: payload.venueId,
      status: 'PENDING',
      message: payload.message?.trim() || null,
      created_at: now,
      updated_at: now,
    };

    const { error: insertError } = await this.supabase.from('venue_artist_suggestions').insert(row);
    if (insertError) throw new BadRequestException(insertError.message);

    const prefs = await this.usersService.getNotificationPreferencesByUserId(venue.userId);
    if (prefs.suggestions) {
      await this.notificationsRepo.createManyByUser([
        {
          userId: venue.userId,
          role: 'VENUE',
          type: 'VENUE_ARTIST_SUGGESTION_CREATED',
          payload: {
            suggestionId: id,
            artistId: artist.id,
            artistName: artist.name,
            managerName: managerRow?.name ?? 'Manager',
            managerId: userContext.managerId,
            venueId: payload.venueId,
            message: row.message,
          },
        },
      ]);
    }

    return {
      id,
      status: 'PENDING' as VenueSuggestionStatus,
      artistId: artist.id,
      artistName: artist.name,
      venueId: payload.venueId,
      message: row.message,
    };
  }

  async listForVenue(userContext: UserContext, status?: VenueSuggestionStatus | 'ALL') {
    if (!userContext.venueId) {
      throw new ForbiddenException('ONLY_VENUE');
    }

    let query = this.supabase
      .from('venue_artist_suggestions')
      .select('id, manager_id, artist_id, venue_id, status, message, created_at, updated_at')
      .eq('venue_id', userContext.venueId)
      .order('created_at', { ascending: false });

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const rows = (data ?? []) as SuggestionRow[];
    if (!rows.length) return [];

    const artistIds = Array.from(new Set(rows.map((item) => item.artist_id)));
    const managerIds = Array.from(new Set(rows.map((item) => item.manager_id)));

    const [artistsRes, managersRes] = await Promise.all([
      this.supabase.from('artists').select('id,name,city,genres').in('id', artistIds),
      this.supabase.from('managers').select('id,name').in('id', managerIds),
    ]);

    if (artistsRes.error) throw new BadRequestException(artistsRes.error.message);
    if (managersRes.error) throw new BadRequestException(managersRes.error.message);

    const artistsById = new Map((artistsRes.data ?? []).map((item: any) => [item.id, item]));
    const managersById = new Map((managersRes.data ?? []).map((item: any) => [item.id, item]));

    return rows.map((row) => {
      const artist = artistsById.get(row.artist_id);
      const manager = managersById.get(row.manager_id);
      return {
        id: row.id,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        artistId: row.artist_id,
        artistName: artist?.name ?? 'Artista',
        artistCity: artist?.city ?? null,
        artistGenres: Array.isArray(artist?.genres) ? artist.genres : [],
        managerId: row.manager_id,
        managerName: manager?.name ?? 'Manager',
      };
    });
  }

  async updateStatusForVenue(
    userContext: UserContext,
    suggestionId: string,
    payload: { status: 'VIEWED' | 'SAVED' | 'ACCEPTED' | 'DECLINED' },
  ) {
    if (!userContext.venueId) {
      throw new ForbiddenException('ONLY_VENUE');
    }

    const { data: found, error: findError } = await this.supabase
      .from('venue_artist_suggestions')
      .select('id, manager_id, artist_id, venue_id, status')
      .eq('id', suggestionId)
      .eq('venue_id', userContext.venueId)
      .maybeSingle();

    if (findError) throw new BadRequestException(findError.message);
    if (!found) throw new NotFoundException('SUGGESTION_NOT_FOUND');
    if (!['PENDING', 'VIEWED', 'SAVED'].includes((found as any).status)) {
      throw new BadRequestException('SUGGESTION_ALREADY_RESOLVED');
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await this.supabase
      .from('venue_artist_suggestions')
      .update({
        status: payload.status,
        updated_at: now,
        responded_at: payload.status === 'ACCEPTED' || payload.status === 'DECLINED' ? now : null,
      })
      .eq('id', suggestionId)
      .eq('venue_id', userContext.venueId)
      .select('id, manager_id, artist_id, venue_id, status')
      .single();

    if (updateError) throw new BadRequestException(updateError.message);

    if (payload.status === 'ACCEPTED' || payload.status === 'DECLINED') {
      const venue = await this.venueRepository.findById(userContext.venueId);
      const managerId = (updated as any).manager_id as string;
      const artistId = (updated as any).artist_id as string;
      const artist = await this.artistRepository.findById(artistId);

      const { data: managerRow } = await this.supabase
        .from('managers')
        .select('user_id')
        .eq('id', managerId)
        .maybeSingle();

      const managerUserId = managerRow?.user_id as string | undefined;
      if (managerUserId) {
        const prefs = await this.usersService.getNotificationPreferencesByUserId(managerUserId);
        if (prefs.suggestions) {
          await this.notificationsRepo.createManyByUser([
            {
              userId: managerUserId,
              role: 'MANAGER',
              type: 'VENUE_ARTIST_SUGGESTION_RESOLVED',
              payload: {
                suggestionId,
                status: payload.status,
                venueId: userContext.venueId,
                venueName: venue?.name ?? 'Sala',
                artistId,
                artistName: artist?.name ?? 'Artista',
              },
            },
          ]);
        }
      }
    }

    return {
      id: (updated as any).id,
      status: (updated as any).status as VenueSuggestionStatus,
    };
  }
}
