// get-events.query.ts
import { EventRepository } from '../repositories/event.repository';
import { EventReadDto } from '../dto/event-read.dto';
import { EventMapper } from '../mappers/event.mapper';

export class GetEventsQuery {
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(ownerId: string): Promise<EventReadDto[]> {
    
    const events = await this.eventRepository.findByOwner(ownerId);
    return events.map(EventMapper.toReadDto);
  }
}

