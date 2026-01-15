import { EventStatus } from '../enums/event-status.enum';
import { EventVisibility } from '../enums/event-visibility.enum';

export class EventEntity {
  constructor(
    public readonly id: string,

    // Identidad
    public name: string,

    // Ownership
    public ownerId: string, // promotor (userId / orgId)

    // Estado
    public status: EventStatus,

    // Marco temporal
    public start_date: Date,
    public endDate: Date | null,

    // Contexto opcional
    public venueId: string | null,
    public type: string | null,

    // Planificación (no financiera)
    public estimatedBudget: number | null,

    // Notas internas
    public description: string | null,

    // Auditoría
    public createdAt: Date,
    public updatedAt: Date,
    //Visibilidad
    public visibility: EventVisibility = EventVisibility.PRIVATE
  ) {}

  changeVisibility(visibility: EventVisibility) {
    this.visibility = visibility;
  }

  
}
 
