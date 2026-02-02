// event.mapper.ts
import { EventEntity } from '../entities/event.entity';
import { EventReadDto } from '../dto/event-read.dto';

export class EventMapper {
static toReadDto(event: EventEntity): EventReadDto {
  return {
    id: event.id,
    name: event.name,
    status: event.status,

    start_date: event.startDate,
    endDate: event.endDate,

    venueId: event.venueId,
    type: event.type,

    estimatedBudget: event.estimatedBudget,
    description: event.description,

    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    visibility: event.visibility,
  };
}

}

