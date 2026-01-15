import { Inject, Injectable } from '@nestjs/common';

import { BookingStatus } from '../../booking-status.enum';
import { BookingStateMachine } from '../../booking-state-machine';



import { v4 as uuid } from 'uuid';
import { BookingRepository } from '../../repositories/booking.repository.interface';
import { CancellationRepository } from 'src/infrastructure/database/repositories/cancellation.repository';
import { CancellationInitiator } from '../cancellation-initiator.enum';
import { CancellationReason } from '../cancellation-reason.enum';
import { CancellationReviewStatus } from '../cancellation-review-status.enum';
import { CancellationRecord } from '../cancellation-record.entity';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import { CANCELLATION_REPOSITORY } from '../cancellation.repository.token';

@Injectable()
export class CancelBookingUseCase {
  private readonly bookingRepo: BookingRepository;
  private readonly cancellationRepo: CancellationRepository;
  constructor(
    @Inject(BOOKING_REPOSITORY) bookingRepository: any,
    @Inject(CANCELLATION_REPOSITORY) cancellationRepository: any,
  ) {
    this.bookingRepo = bookingRepository;
    this.cancellationRepo = cancellationRepository;
  }


  async execute(params: {
    bookingId: string;
    initiator: CancellationInitiator;
    reason: CancellationReason;
    description?: string;
  }) {
    const { bookingId, initiator, reason, description } = params;

    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.CANCELLED_PENDING_REVIEW ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new Error('BOOKING_CANNOT_BE_CANCELLED');
    }

    const existingCancellation =
      await this.cancellationRepo.findByBookingId(bookingId);

    if (existingCancellation) {
      throw new Error('BOOKING_ALREADY_CANCELLED');
    }

    const previousStatus = booking.status;

    const resultingStatus = BookingStatus.CANCELLED_PENDING_REVIEW;
    const reviewStatus = CancellationReviewStatus.PENDING;


    const cancellation = new CancellationRecord({
      id: uuid(),
      bookingId,
      initiator,
      reason,
      description,
      previousStatus,
      resultingStatus,
      reviewStatus,
      createdAt: new Date(),
    });

    await this.cancellationRepo.save(cancellation);

    booking.changeStatus(resultingStatus);

    await this.bookingRepo.save(booking);

    return booking;
  }
}
