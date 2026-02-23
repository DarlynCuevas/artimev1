import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { EventRepository } from '@/src/modules/events/repositories/event.repository';

import { EventEntity } from '@/src/modules/events/entities/event.entity';
import { EventStatus } from '@/src/modules/events/enums/event-status.enum';
import { EventVisibility } from '@/src/modules/events/enums/event-visibility.enum';

@Injectable()
export class SupabaseEventRepository implements EventRepository {
  constructor(private readonly supabase: SupabaseClient) { }

  async save(event: EventEntity): Promise<void> {
    const { error } = await this.supabase.from('events').insert({
      id: event.id,
      name: event.name,
      owner_id: event.ownerId,

      organizer_promoter_id: event.organizerPromoterId,
      organizer_venue_id: event.organizerVenueId,

      status: event.status,
      visibility: event.visibility,

      start_date: event.startDate ?? null,
      end_date: event.endDate,

      venue_id: event.venueId,
      type: event.type,

      estimated_budget: event.estimatedBudget,
      description: event.description,

      created_at: event.createdAt,
      updated_at: event.updatedAt,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async update(event: EventEntity): Promise<void> {
    const { error } = await this.supabase
      .from('events')
      .update({
        name: event.name,
        status: event.status,
        visibility: event.visibility,

        start_date: event.startDate ?? null,
        end_date: event.endDate,

        venue_id: event.venueId,
        type: event.type,

        estimated_budget: event.estimatedBudget,
        description: event.description,

        updated_at: event.updatedAt,
      })
      .eq('id', event.id);

    if (error) {
      throw new Error(error.message);
    }
  }


  async findById(eventId: string): Promise<EventEntity | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapRowToEvent(data);
  }


  async findByOrganizer(params: {
    organizerPromoterId: string | null;
    organizerVenueId: string | null;
  }): Promise<EventEntity[]> {
    let query = this.supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (params.organizerPromoterId) {
      query = query.eq(
        'organizer_promoter_id',
        params.organizerPromoterId,
      );
    }

    if (params.organizerVenueId) {
      query = query.eq(
        'organizer_venue_id',
        params.organizerVenueId,
      );
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((row) => this.mapRowToEvent(row));
  }


  private mapRowToEvent(row: any): EventEntity {
    return new EventEntity(
      row.id,
      row.name,

      row.owner_id,

      row.organizer_promoter_id ?? null,
      row.organizer_venue_id ?? null,

      row.status as EventStatus,
      (row.visibility as EventVisibility) ?? EventVisibility.PRIVATE,

      row.start_date ? new Date(row.start_date) : null,
      row.end_date ? new Date(row.end_date) : null,

      row.venue_id ?? null,
      row.type ?? null,

      row.estimated_budget ?? null,
      row.description ?? null,

      new Date(row.created_at),
      new Date(row.updated_at),
    );
  }
}


