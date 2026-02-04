import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventStatus } from '../enums/event-status.enum';
import type { EventRepository } from '../repositories/event.repository';
import { EVENT_REPOSITORY } from '../repositories/event.repository.token';
import { EventEntity } from '../entities/event.entity';
import { EventMapper } from '../mappers/event.mapper';
import type { EventReadDto } from '../dto/event-read.dto';

export interface DuplicateEventCommand {
  eventId: string;
  requesterId: string;
}

export class DuplicateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(command: DuplicateEventCommand): Promise<EventReadDto> {
    const event = await this.eventRepository.findById(command.eventId);

    if (!event) {
      throw new Error('EVENT_NOT_FOUND');
    }

    const now = new Date();
    const duplicated = new EventEntity(
      randomUUID(),
      event.name,
      command.requesterId,
      event.organizerPromoterId,
      event.organizerVenueId,
      EventStatus.DRAFT,
      event.visibility,
      null,
      null,
      event.venueId,
      event.type,
      event.estimatedBudget,
      event.description,
      now,
      now,
    );

    await this.eventRepository.save(duplicated);

    return EventMapper.toReadDto(duplicated);
  }
}
