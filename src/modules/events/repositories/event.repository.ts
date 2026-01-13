import { Event } from '../entities/event.entity';

export interface EventRepository {
  save(event: Event): Promise<void>;

  findById(eventId: string): Promise<Event | null>;

  findByOwner(ownerId: string): Promise<Event[]>;

  update(event: Event): Promise<void>;
}
