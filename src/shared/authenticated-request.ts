import { Request } from 'express';
import { EventEntity } from '../modules/events/entities/event.entity';
export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
  };
  event?: EventEntity;
}