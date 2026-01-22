import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';

export type ArtistNotification = {
  id: string;
  artist_id: string;
  type: string;
  payload: Record<string, any>;
  status: 'UNREAD' | 'READ';
  created_at: string;
};

export type NotificationStatus = 'UNREAD' | 'READ';

@Injectable()
export class ArtistNotificationRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async createMany(params: Array<{ artistId: string; type: string; payload: Record<string, any> }>) {
    if (!params.length) return [] as ArtistNotification[];

    const rows = params.map((item) => ({
      artist_id: item.artistId,
      type: item.type,
      payload: item.payload,
      status: 'UNREAD',
    }));

    const { data, error } = await this.supabase.from('artist_notifications').insert(rows).select();

    if (error) {
      throw error;
    }

    return (data ?? []) as ArtistNotification[];
  }

  async findByArtist(params: { artistId: string; limit?: number }) {
    const { artistId, limit = 50 } = params;

    const { data, error } = await this.supabase
      .from('artist_notifications')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as ArtistNotification[];
  }

  async markRead(params: { id: string; artistId: string }) {
    const { id, artistId } = params;

    const { data, error } = await this.supabase
      .from('artist_notifications')
      .update({ status: 'READ' as NotificationStatus })
      .eq('id', id)
      .eq('artist_id', artistId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as ArtistNotification;
  }

  async markCallNotificationsRead(params: { artistId: string; callId: string }) {
    const { artistId, callId } = params;
    if (!callId) return;

    const { error } = await this.supabase
      .from('artist_notifications')
      .update({ status: 'READ' as NotificationStatus })
      .eq('artist_id', artistId)
      .eq('type', 'ARTIST_CALL_CREATED')
      .eq('payload->>callId', callId);

    if (error) {
      throw error;
    }
  }
}
