// event-read.dto.ts
import { EventStatus } from '../enums/event-status.enum';
import { EventVisibility } from '../enums/event-visibility.enum';

export interface EventReadDto {
  id: string;
  name: string;
  status: EventStatus;

  start_date: Date | null;
  endDate: Date | null;

  venueId: string | null;
  type: string | null;

  estimatedBudget: number | null;
  description: string | null;

  createdAt: Date;
  updatedAt: Date;
  visibility: EventVisibility;
}
