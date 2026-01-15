import { EventDay } from '../entities/event-day.entity';

export interface EventDayRepository {
  create(day: EventDay): Promise<EventDay>;
  findByEvent(eventId: string): Promise<EventDay[]>;
}
