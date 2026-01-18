import { BookingStatus } from "../../booking-status.enum";
import { CancellationReason } from "../enums/cancellation-reason.enum";
import { CancellationStatus } from "../enums/cancellation-status.enum";

export class CancellationCase {
  id: string;

  bookingId: string;

  requestedByRole: 'ARTIST' | 'MANAGER' | 'VENUE' | 'PROMOTER';
  requestedByUserId: string;

  reason: CancellationReason;
  description?: string;

  bookingStatusAtCancellation: BookingStatus;
  paymentStatusAtCancellation: 'NONE' | 'PAID_PARTIAL' | 'PAID_FULL';

  status: CancellationStatus;

  createdAt: Date;
  resolvedAt?: Date;
}