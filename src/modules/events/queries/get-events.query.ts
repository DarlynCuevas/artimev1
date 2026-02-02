// get-events.query.ts
import { EventRepository } from '../repositories/event.repository';
import { EventReadDto } from '../dto/event-read.dto';
import { EventMapper } from '../mappers/event.mapper';

export class GetEventsQuery {
  constructor(
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(params: {
    organizerPromoterId?: string | null;
    organizerVenueId?: string | null;
  }): Promise<EventReadDto[]> {

    if (!params.organizerPromoterId && !params.organizerVenueId) {
      return [];
    }

    const events = await this.eventRepository.findByOrganizer({
      organizerPromoterId: params.organizerPromoterId ?? null,
      organizerVenueId: params.organizerVenueId ?? null,
    });

    return events.map(EventMapper.toReadDto);
  }
}

