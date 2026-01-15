export class EventBookingLink {
  id: string;

  event_id: string;
  booking_id: string;

  event_day_id?: string; // nullable
  order?: number;        // posición en el line-up
  start_time?: string;  // HH:mm
  end_time?: string;    // HH:mm

  created_at: Date;
}
