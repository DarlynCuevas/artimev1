import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';


import { EventInvitation } from 'src/modules/events/entities/event-invitation.entity';
import { EventInvitationRepository } from 'src/modules/events/repositories/event-invitation.repository';
@Injectable()
export class SupabaseEventInvitationRepository
  implements EventInvitationRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async create(invitation: EventInvitation): Promise<void> {
    const { error } = await this.supabase
      .from('event_invitations')
      .insert({
        id: invitation.id,
        event_id: invitation.eventId,
        artist_id: invitation.artistId,
        status: invitation.status,
        created_at: invitation.createdAt,
        updated_at: invitation.updatedAt,
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  async findById(invitationId: string): Promise<EventInvitation | null> {
    const { data, error } = await this.supabase
      .from('event_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToInvitation(data);
  }

  async findByEvent(eventId: string): Promise<EventInvitation[]> {
    const { data, error } = await this.supabase
      .from('event_invitations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapRowToInvitation(row));
  }

  async findByEventAndArtist(
    eventId: string,
    artistId: string,
  ): Promise<EventInvitation | null> {
    const { data, error } = await this.supabase
      .from('event_invitations')
      .select('*')
      .eq('event_id', eventId)
      .eq('artist_id', artistId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToInvitation(data);
  }

  async update(invitation: EventInvitation): Promise<void> {
    const { error } = await this.supabase
      .from('event_invitations')
      .update({
        status: invitation.status,
        updated_at: invitation.updatedAt,
      })
      .eq('id', invitation.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  // ------------------------
  // Mapper privado
  // ------------------------

  private mapRowToInvitation(row: any): EventInvitation {
    return new EventInvitation(
      row.id,
      row.event_id,
      row.artist_id,
      row.status,
      new Date(row.created_at),
      new Date(row.updated_at),
    );
  }
}
