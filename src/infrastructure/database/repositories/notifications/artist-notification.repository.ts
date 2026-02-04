import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';

export type ArtistNotification = {
  id: string;
  artist_id?: string | null;
  user_id?: string | null;
  role?: string | null;
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
      role: 'ARTIST',
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

  async createManyByUser(params: Array<{ userId: string; role: string; type: string; payload: Record<string, any> }>) {
    if (!params.length) return [] as ArtistNotification[];

    const { data, error } = await this.supabase
      .from('artist_notifications')
      .insert(
        params.map((item) => ({
          user_id: item.userId,
          role: item.role,
          type: item.type,
          payload: item.payload,
          status: 'UNREAD',
        })),
      )
      .select();

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

  async markReadByArtist(params: { id: string; artistId: string }) {
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

  async findByUser(params: { userId: string; role?: string; limit?: number }) {
    const { userId, role, limit = 50 } = params;

    let query = this.supabase
      .from('artist_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as ArtistNotification[];
  }

  async markRead(params: { id: string; userId: string }) {
    const { id, userId } = params;

    const { data, error } = await this.supabase
      .from('artist_notifications')
      .update({ status: 'READ' as NotificationStatus })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as ArtistNotification;
  }

  async markCallNotificationsRead(params: { userId: string; callId: string }) {
    const { userId, callId } = params;
    if (!callId) return;

    const { error } = await this.supabase
      .from('artist_notifications')
      .update({ status: 'READ' as NotificationStatus })
      .eq('user_id', userId)
      .eq('type', 'ARTIST_CALL_CREATED')
      .eq('payload->>callId', callId);

    if (error) {
      throw error;
    }
  }

  async markEventInvitationNotificationsRead(params: { userId: string; invitationId: string }) {
    const { userId, invitationId } = params;
    if (!invitationId) return;

    const { error } = await this.supabase
      .from('artist_notifications')
      .update({ status: 'READ' as NotificationStatus })
      .eq('user_id', userId)
      .eq('type', 'EVENT_INVITATION_CREATED')
      .eq('payload->>invitationId', invitationId);

    if (error) {
      throw error;
    }
  }
}
