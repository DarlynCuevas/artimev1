// create-event.usecase.ts
import { EventEntity } from '../entities/event.entity';
import type { EventRepository } from '../repositories/event.repository';
import { EventStatus } from '../enums/event-status.enum';
import { randomUUID } from 'crypto';
import { EVENT_REPOSITORY } from '../repositories/event.repository.token';
import { Inject } from '@nestjs/common';
import { EventVisibility } from '../enums/event-visibility.enum';

export interface CreateEventCommand {
  name: string;
  ownerId: string;

  // Organizador (exactamente uno)
  organizerPromoterId?: string | null;
  organizerVenueId?: string | null;

  start_date: Date;
  endDate?: Date | null;

  venueId?: string | null;
  type?: string | null;
  estimatedBudget?: number | null;
  description?: string | null;
}




export class CreateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) { }

  async execute(command: CreateEventCommand): Promise<void> {

    // Validación de integridad (OBLIGATORIA)
    if (!command.ownerId) {
      throw new Error('Event must have an owner');
    }
    if (!command.organizerPromoterId && !command.organizerVenueId) {
      throw new Error('Event must have exactly one organizer');
    }
    if (command.organizerPromoterId && command.organizerVenueId) {
      throw new Error('Event cannot have two organizers');
    }

    const event = new EventEntity(
      randomUUID(),
      command.name,

      command.ownerId,

      command.organizerPromoterId ?? null,
      command.organizerVenueId ?? null,

      EventStatus.DRAFT,
      EventVisibility.PRIVATE, // o el default que tengas definido

      command.start_date,
      command.endDate ?? null,

      command.venueId ?? null,
      command.type ?? null,

      command.estimatedBudget ?? null,
      command.description ?? null,

      new Date(),
      new Date(),
    );


    await this.eventRepository.save(event);
  }
}


