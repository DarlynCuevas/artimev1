import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { EventRepository } from 'src/modules/events/repositories/event.repository';

import { Event } from 'src/modules/events/entities/event.entity';
import { EventStatus } from 'src/modules/events/enums/event-status.enum';

@Injectable()
export class SupabaseEventRepository implements EventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(event: Event): Promise<void> {
    const { error } = await this.supabase.from('events').insert({
      id: event.id,
      name: event.name,

      owner_id: event.ownerId,
      status: event.status,

      start_date: event.startDate,
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

  async update(event: Event): Promise<void> {
    const { error } = await this.supabase
      .from('events')
      .update({
        name: event.name,
        status: event.status,

        start_date: event.startDate,
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

  async findById(eventId: string): Promise<Event | null> {
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

  async findByOwner(ownerId: string): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(this.mapRowToEvent);
  }

  private mapRowToEvent(row: any): Event {
    return new Event(
      row.id,
      row.name,
      row.owner_id,
      row.status as EventStatus,
      new Date(row.start_date),
      row.end_date ? new Date(row.end_date) : null,
      row.venue_id,
      row.type,
      row.estimated_budget,
      row.description,
      new Date(row.created_at),
      new Date(row.updated_at),
    );
  }
}
