import { Inject, Injectable } from "@nestjs/common";
import { EventVisibility } from "../enums/event-visibility.enum";
import  { EVENT_REPOSITORY } from "../repositories/event.repository.token";
import type { EventRepository } from "../repositories/event.repository";
import { EventEntity } from "../entities/event.entity";

@Injectable()
export class UpdateEventVisibilityUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(eventId: string , visibility: EventVisibility) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    
  event.changeVisibility(visibility);
  
  await this.eventRepository.update(event);
  return event; 
}
}
