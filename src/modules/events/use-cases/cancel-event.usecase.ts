// cancel-event.usecase.ts
import type { EventRepository } from '../repositories/event.repository';
import { EventStatus } from '../enums/event-status.enum';
import { EVENT_REPOSITORY } from '../repositories/event.repository.token';
import { Inject } from '@nestjs/common';

export interface CancelEventCommand {
  eventId: string;
  requesterId: string;
}


export class CancelEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepository) {}

  async execute(command: CancelEventCommand): Promise<void> {
    const event = await this.eventRepository.findById(command.eventId);

    if (!event) {
      throw new Error('EVENT_NOT_FOUND');
    }

    if (event.ownerId !== command.requesterId) {
      throw new Error('FORBIDDEN');
    }

    if (event.status === EventStatus.CANCELLED) {
      // idempotente: cancelar dos veces no rompe nada
      return;
    }

    event.status = EventStatus.CANCELLED;
    event.updatedAt = new Date();

    await this.eventRepository.update(event);
  }
}

