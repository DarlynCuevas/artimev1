import { EventStatus } from '../enums/event-status.enum';
import { EventVisibility } from '../enums/event-visibility.enum';

export class EventEntity {
  constructor(
    public readonly id: string,
    public name: string,

    // Organizador (exactamente uno)
    public readonly organizerPromoterId: string | null,
    public readonly organizerVenueId: string | null,

    // Estado
    public status: EventStatus,
    public visibility: EventVisibility,
    // Fechas
    public startDate: Date,
    public endDate: Date | null,

    // Contexto
    public venueId: string | null,
    public type: string | null,

    // Planificación
    public estimatedBudget: number | null,

    // Notas
    public description: string | null,

    // Auditoría
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  changeVisibility(visibility: EventVisibility) {
    this.visibility = visibility;
    this.updatedAt = new Date();
  }
}

 
