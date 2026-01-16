// src/modules/managers/entities/artist-manager-representation.entity.ts

export type RepresentationCreatedBy = 'ARTIST' | 'MANAGER' | 'SYSTEM';
export type RepresentationEndedBy = 'ARTIST' | 'MANAGER' | null;

export class ArtistManagerRepresentation {
  constructor(
    public readonly id: string,

    public readonly artistId: string,
    public readonly managerId: string,

    public readonly commissionPercentage: number,

    public readonly startsAt: Date,
    public readonly endsAt: Date | null,

    public readonly terminationRequestedAt: Date | null,

    public readonly version: number,

    public readonly createdAt: Date,
    public readonly createdBy: RepresentationCreatedBy,

    public readonly endedBy: RepresentationEndedBy,
  ) {}

  /**
   * Helpers de lectura (NO lógica de negocio)
   * Son seguros porque solo derivan del estado actual
   */

  isActive(at: Date = new Date()): boolean {
    if (this.endsAt && this.endsAt < at) return false;
    return this.startsAt <= at;
  }

  isInNoticePeriod(at: Date = new Date()): boolean {
    if (!this.terminationRequestedAt || !this.endsAt) return false;
    return at < this.endsAt;
  }
}
