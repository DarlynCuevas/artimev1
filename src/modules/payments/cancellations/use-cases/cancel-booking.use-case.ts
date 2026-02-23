import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BOOKING_REPOSITORY } from '@/src/modules/bookings/repositories/booking-repository.token';
import type { BookingRepository } from '@/src/modules/bookings/repositories/booking.repository.interface';
import { BookingStatus } from '@/src/modules/bookings/booking-status.enum';
import { CANCELLATION_REPOSITORY } from '../cancellation.repository.token';
import type { CancellationRepository } from '../cancellation.repository';
import { CancellationRecord } from '../cancellation-record.entity';
import { CancellationInitiator } from '@/src/modules/bookings/cancellations/enums/cancellation-initiator.enum';

@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    @Inject(CANCELLATION_REPOSITORY)
    private readonly cancellationRepository: CancellationRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    initiator: CancellationInitiator;
    reason?: string;
    description?: string;
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking already cancelled');
    }

    // Guardar el estado previo y el resultante
    const previousStatus = booking.status;
    const resultingStatus = BookingStatus.CANCELLED;
    const record = CancellationRecord.create({
      id: randomUUID(),
      bookingId: booking.id,
      initiator: input.initiator,
      reason: input.reason,
      previousStatus,
      resultingStatus,
    });

    record.previousStatus = previousStatus;
    record.resultingStatus = resultingStatus;

    await this.cancellationRepository.save(record);

    booking.changeStatus(resultingStatus);
    await this.bookingRepository.update(booking);
  }
}
