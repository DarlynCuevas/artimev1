export type ArtistBookingConditions = {
  crewSize: number | null;
  hotelRooms: number | null;
  hotelNights: number | null;
  requiresFlights: boolean;
  requiresGroundTransport: boolean;
  hospitalityNotes: string;
  technicalNotes: string;
  additionalNotes: string;
};

export const DEFAULT_ARTIST_BOOKING_CONDITIONS: ArtistBookingConditions = {
  crewSize: null,
  hotelRooms: null,
  hotelNights: null,
  requiresFlights: false,
  requiresGroundTransport: false,
  hospitalityNotes: '',
  technicalNotes: '',
  additionalNotes: '',
};

export function normalizeArtistBookingConditions(
  input?: Partial<ArtistBookingConditions> | null,
): ArtistBookingConditions {
  const raw = input ?? {};
  const normalizeNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.round(parsed);
  };

  const normalizeText = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, 1200);
  };

  return {
    crewSize: normalizeNumber(raw.crewSize),
    hotelRooms: normalizeNumber(raw.hotelRooms),
    hotelNights: normalizeNumber(raw.hotelNights),
    requiresFlights: Boolean(raw.requiresFlights),
    requiresGroundTransport: Boolean(raw.requiresGroundTransport),
    hospitalityNotes: normalizeText(raw.hospitalityNotes),
    technicalNotes: normalizeText(raw.technicalNotes),
    additionalNotes: normalizeText(raw.additionalNotes),
  };
}
