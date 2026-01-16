// booking-transitions.ts

import { BookingStatus } from './booking-status.enum';

export const BOOKING_TRANSITIONS: Record<
  BookingStatus,
  BookingStatus[]
> = {
  [BookingStatus.DRAFT]: [
    BookingStatus.PENDING,
  ],

  [BookingStatus.PENDING]: [
    BookingStatus.NEGOTIATING,
    BookingStatus.ACCEPTED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
  ],

  [BookingStatus.NEGOTIATING]: [
    BookingStatus.FINAL_OFFER_SENT,
    BookingStatus.CANCELLED,
    BookingStatus.ACCEPTED,
    BookingStatus.REJECTED,
  ],

  [BookingStatus.FINAL_OFFER_SENT]: [
    BookingStatus.ACCEPTED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
  ],

  [BookingStatus.ACCEPTED]: [
    BookingStatus.CONTRACT_SIGNED,
    BookingStatus.CANCELLED,
  ],

  [BookingStatus.CONTRACT_SIGNED]: [
    BookingStatus.PAID_PARTIAL,
    BookingStatus.CANCELLED,
  ],

  [BookingStatus.PAID_PARTIAL]: [
    BookingStatus.PAID_FULL,
    BookingStatus.CANCELLED_PENDING_REVIEW,
  ],

  [BookingStatus.PAID_FULL]: [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED_PENDING_REVIEW,
  ],

  [BookingStatus.COMPLETED]: [],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.CANCELLED_PENDING_REVIEW]: [],
};
