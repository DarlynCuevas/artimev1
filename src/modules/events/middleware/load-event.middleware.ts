import { Injectable, NestMiddleware, NotFoundException, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import type { EventRepository } from '../repositories/event.repository';
import { EVENT_REPOSITORY } from '../repositories/event.repository.token';


@Injectable()
export class LoadEventMiddleware implements NestMiddleware {
  
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) { }

async use(req: Request, res: Response, next: NextFunction) {

  const rawId = req.params.id;

  const eventId =
    Array.isArray(rawId) ? rawId[0] : rawId;

  if (!eventId) {
    throw new NotFoundException('Invalid event id');
  }

  const event = await this.eventRepository.findById(eventId);

  if (!event) {
    throw new NotFoundException('Event not found');
  }

  (req as any).event = event;

  next();
}

}
