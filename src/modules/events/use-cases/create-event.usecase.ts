// create-event.usecase.ts
import { Event } from '../entities/event.entity';
import type { EventRepository } from '../repositories/event.repository';
import { EventStatus } from '../enums/event-status.enum';
import { randomUUID } from 'crypto';
import { EVENT_REPOSITORY } from '../repositories/event.repository.token';
import { Inject } from '@nestjs/common';

export interface CreateEventCommand {
  name: string;
  ownerId: string;

  start_date: Date;
  endDate?: Date | null;

  venueId?: string | null;
  type?: string | null;
  estimatedBudget?: number | null;
  description?: string | null;
}



export class CreateEventUseCase {
  constructor(@Inject(EVENT_REPOSITORY) 
                private readonly eventRepository: EventRepository) {}

  async execute(command: CreateEventCommand): Promise<void> {
    const event = new Event(
      randomUUID(),

      // Identidad
      command.name,

      // Owner
      command.ownerId,

      // Estado inicial (cerrado)
      EventStatus.DRAFT,

      // Marco temporal
      command.start_date,
      command.endDate ?? null,

      // Contexto opcional
      command.venueId ?? null,
      command.type ?? null,

      // Planificación
      command.estimatedBudget ?? null,

      // Notas
      command.description ?? null,

      // Auditoría
      new Date(),
      new Date(),
    );

    await this.eventRepository.save(event);
  }
}
