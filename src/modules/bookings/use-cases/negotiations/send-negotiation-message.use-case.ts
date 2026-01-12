// send-negotiation-message.use-case.ts

import { BookingStatus } from '../../booking-status.enum';
import {
  NegotiationMessage,
  NegotiationSenderRole,
} from '../../negotiations/negotiation-message.entity';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import { Inject, Injectable } from '@nestjs/common';
import { NegotiationMessageRepository } from '../../../../infrastructure/database/repositories/negotiation-message.repository';

@Injectable()
export class SendNegotiationMessageUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    senderRole: NegotiationSenderRole;
    message?: string;
    proposedFee?: number;
    isFinalOffer: boolean;
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.NEGOTIATING) {
      throw new Error(
        'Negotiation messages can only be sent while booking is in NEGOTIATING state',
      );
    }

    const negotiationMessage = new NegotiationMessage({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      senderRole: input.senderRole,
      message: input.message,
      proposedFee: input.proposedFee,
      isFinalOffer: input.isFinalOffer,
      createdAt: new Date(),
    });

    await this.negotiationMessageRepository.save(negotiationMessage);

    if (input.isFinalOffer) {
      booking.changeStatus(BookingStatus.FINAL_OFFER_SENT);
      await this.bookingRepository.update(booking);
    }
  }
}
