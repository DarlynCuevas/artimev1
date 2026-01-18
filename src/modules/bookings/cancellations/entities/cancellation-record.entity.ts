import { CancellationInitiator } from '../enums/cancellation-initiator.enum';
import { CancellationReason } from '../enums/cancellation-reason.enum';
import { CancellationReviewStatus } from '../enums/cancellation-review-status.enum';
import { BookingStatus } from '../../booking-status.enum';

interface CancellationRecordProps {
  id: string;
  bookingId: string;
  initiated_by?: string;
  initiator: CancellationInitiator;
  reason: CancellationReason;
  description?: string;
  previousStatus: BookingStatus;
  resultingStatus: BookingStatus;
  reviewStatus: CancellationReviewStatus; 
  createdAt: Date;
}

export class CancellationRecord {
  private props: CancellationRecordProps;

  constructor(props: CancellationRecordProps) {
    this.props = props;
  }

  get id() {
    return this.props.id;
  }

  get bookingId() {
    return this.props.bookingId;
  }

  get initiator() {
    return this.props.initiator;
  }

  get initiatedBy() {
    return this.props.initiated_by;
  }

  get reason() {
    return this.props.reason;
  }

  get description() {
    return this.props.description;
  }

  get previousStatus() {
    return this.props.previousStatus;
  }

  get resultingStatus() {
    return this.props.resultingStatus;
  }

  get reviewStatus() {
    return this.props.reviewStatus;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  requiresReview(): boolean {
    return this.props.reviewStatus === CancellationReviewStatus.PENDING;
  }
}
