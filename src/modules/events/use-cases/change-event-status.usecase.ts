// change-event-status.usecase.ts
import { Inject } from '@nestjs/common';
import { EVENT_REPOSITORY } from '../repositories/event.repository.token';
import type { EventRepository } from '../repositories/event.repository';
import { EventStatus } from '../enums/event-status.enum';

export interface ChangeEventStatusCommand {
  eventId: string;
  requesterId: string;
  nextStatus: EventStatus;
}

export class ChangeEventStatusUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(command: ChangeEventStatusCommand): Promise<void> {
    const event = await this.eventRepository.findById(command.eventId);

    if (!event) throw new Error('EVENT_NOT_FOUND');
    if (event.organizerPromoterId !== command.requesterId && event.organizerVenueId !== command.requesterId) throw new Error('FORBIDDEN');

    // Transición permitida (cerrada)
    if (
      event.status === EventStatus.DRAFT &&
      command.nextStatus === EventStatus.SEARCHING
    ) {
      event.status = EventStatus.SEARCHING;
      event.updatedAt = new Date();
      await this.eventRepository.update(event);
      return;
    }

    throw new Error('INVALID_EVENT_TRANSITION');
  }
}
