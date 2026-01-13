// event.mapper.ts
import { Event } from '../entities/event.entity';
import { EventReadDto } from '../dto/event-read.dto';

export class EventMapper {
  static toReadDto(event: Event): EventReadDto {
    return {
      id: event.id,
      name: event.name,
      status: event.status,

      startDate: event.startDate,
      endDate: event.endDate,

      venueId: event.venueId,
      type: event.type,

      estimatedBudget: event.estimatedBudget,
      description: event.description,

      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}

