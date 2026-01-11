import type { Booking } from '../booking.entity';

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>;
  update(booking: Booking): Promise<void>;
}
