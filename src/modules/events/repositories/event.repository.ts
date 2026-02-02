import { EventEntity } from '../entities/event.entity';

export interface EventRepository {
  save(event: EventEntity): Promise<void>;

  findById(eventId: string): Promise<EventEntity | null>;


  update(event: EventEntity): Promise<void>;
  findByOrganizer(params: {
  organizerPromoterId: string | null;
  organizerVenueId: string | null;
}): Promise<EventEntity[]>;
}
