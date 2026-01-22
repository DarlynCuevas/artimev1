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

    await this.notificationsRepo.markCallNotificationsRead({ artistId: artist.id, callId });

    return data;
  }
}