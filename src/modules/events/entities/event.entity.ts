import { EventStatus } from '../enums/event-status.enum';

export class Event {
  constructor(
    public readonly id: string,

    // Identidad
    public name: string,

    // Ownership
    public ownerId: string, // promotor (userId / orgId)

    // Estado
    public status: EventStatus,

    // Marco temporal
    public startDate: Date,
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
  ) {}
}
