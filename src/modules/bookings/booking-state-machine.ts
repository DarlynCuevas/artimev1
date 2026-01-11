// booking-state-machine.ts

import { BookingStatus } from './booking-status.enum';
import { canTransition } from './booking-transition.guard';

export class BookingStateMachine {
  static transition(
    current: BookingStatus,
    next: BookingStatus,
  ): BookingStatus {
    const allowed = canTransition(current, next);

    if (!allowed) {
      throw new Error(
        `Invalid booking state transition: ${current} → ${next}`,
      );
    }

    return next;
  }
}
