// event-read.dto.ts
import { EventStatus } from '../enums/event-status.enum';

export interface EventReadDto {
  id: string;
  name: string;
  status: EventStatus;

  startDate: Date;
  endDate: Date | null;

  venueId: string | null;
  type: string | null;

  estimatedBudget: number | null;
  description: string | null;

  createdAt: Date;
  updatedAt: Date;
}
