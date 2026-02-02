// update-event.usecase.ts
import type { EventRepository } from '../repositories/event.repository';
import { EventStatus } from '../enums/event-status.enum';
import { EVENT_REPOSITORY } from '../repositories/event.repository.token';
import { Inject } from '@nestjs/common';
export interface UpdateEventCommand {
  eventId: string;
  organizerPromoterId?: string;
  organizerVenueId?: string;
  name?: string;
  startDate?: Date;
  endDate?: Date;
  venueId?: string;
  type?: string;
  estimatedBudget?: number;
  description?: string;
}


export class UpdateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(command: UpdateEventCommand): Promise<void> {
    const event = await this.eventRepository.findById(command.eventId);

    if (!event) {
      throw new Error('EVENT_NOT_FOUND');
    }

    // Validación de organizador
    const isPromoterOrganizer =
      command.organizerPromoterId &&
      event.organizerPromoterId === command.organizerPromoterId;

    const isVenueOrganizer =
      command.organizerVenueId &&
      event.organizerVenueId === command.organizerVenueId;

    if (!isPromoterOrganizer && !isVenueOrganizer) {
      throw new Error('FORBIDDEN');
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new Error('EVENT_CANCELLED');
    }

    // Edición permitida
    if (command.name !== undefined) {
      event.name = command.name;
    }

    if (command.startDate !== undefined) {
      event.startDate = command.startDate;
    }

    if (command.endDate !== undefined) {
      event.endDate = command.endDate;
    }

    if (command.venueId !== undefined) {
      event.venueId = command.venueId;
    }

    if (command.type !== undefined) {
      event.type = command.type;
    }

    if (command.estimatedBudget !== undefined) {
      event.estimatedBudget = command.estimatedBudget;
    }

    if (command.description !== undefined) {
      event.description = command.description;
    }

    event.updatedAt = new Date();

    await this.eventRepository.update(event);
  }
}
