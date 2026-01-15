import { EventEntity } from '../entities/event.entity';

export interface EventRepository {
  save(event: EventEntity): Promise<void>;

  findById(eventId: string): Promise<EventEntity | null>;

  findByOwner(ownerId: string): Promise<EventEntity[]>;

  update(event: EventEntity): Promise<void>;
}
