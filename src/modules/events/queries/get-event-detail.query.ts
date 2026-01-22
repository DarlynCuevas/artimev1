// get-event-detail.query.ts
import { EventRepository } from '../repositories/event.repository';
import { EventReadDto } from '../dto/event-read.dto';
import { EventMapper } from '../mappers/event.mapper';
import { EventEntity } from '../entities/event.entity';

export class GetEventDetailQuery {
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(eventId: string): Promise<EventReadDto> {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      throw new Error('EVENT_NOT_FOUND');
    }

    return EventMapper.toReadDto(event);
  }
}

