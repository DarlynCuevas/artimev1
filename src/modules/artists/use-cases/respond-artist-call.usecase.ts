import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { ARTIST_REPOSITORY } from '../repositories/artist-repository.token';
import type { ArtistRepository } from '../repositories/artist.repository.interface';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';

@Injectable()
export class RespondArtistCallUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepo: ArtistRepository,
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    private readonly notificationsRepo: ArtistNotificationRepository,
  ) {}

  async execute(userContext: AuthenticatedRequest['userContext'], callId: string, response: 'INTERESTED' | 'NOT_INTERESTED') {
    const artist = await this.artistRepo.findByUserId(userContext.userId);
    if (!artist) {
      throw new NotFoundException('ARTIST_NOT_FOUND');
    }

    const { error, data } = await this.supabase
      .from('venue_artist_call_responses')
      .upsert(
        {
          call_id: callId,
          artist_id: artist.id,
          response,
          responded_at: new Date().toISOString(),
        },
        { onConflict: 'call_id,artist_id' },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    await this.notificationsRepo.markCallNotificationsRead({ userId: userContext.userId, callId });

    if (response === 'INTERESTED') {
      const { data: callData } = await this.supabase
        .from('venue_artist_calls')
        .select('id, venue_id, date, city, venue:venue_id ( id, name, user_id )')
        .eq('id', callId)
        .maybeSingle();

      const venue = Array.isArray((callData as any)?.venue)
        ? (callData as any)?.venue?.[0]
        : (callData as any)?.venue;

      if (venue?.user_id) {
        await this.notificationsRepo.createManyByUser([
          {
            userId: venue.user_id,
            role: 'VENUE',
            type: 'ARTIST_CALL_ACCEPTED',
            payload: {
              callId,
              venueId: venue.id ?? callData?.venue_id ?? null,
              venueName: venue.name ?? null,
              artistId: artist.id,
              artistName: artist.name,
              date: callData?.date ?? null,
              city: callData?.city ?? null,
            },
          },
        ]);
      }
    }

    return data;
  }
}
