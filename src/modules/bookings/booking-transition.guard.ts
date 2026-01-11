// booking-transition.guard.ts

import { BookingStatus } from './booking-status.enum';
import { BOOKING_TRANSITIONS } from './booking-transitions';

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  const allowedNextStates = BOOKING_TRANSITIONS[from];

  if (!allowedNextStates) {
    return false;
  }

  return allowedNextStates.includes(to);
}
