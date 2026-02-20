import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
import { NegotiationSenderRole } from '../../negotiations/negotiation-message.entity';
import { isArtistSide, isSameSide } from '../../booking-turns';

@Injectable()
export class RejectBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    senderUserId: string;
    senderRole: NegotiationSenderRole;
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    if (
      ![BookingStatus.PENDING, BookingStatus.NEGOTIATING].includes(
        booking.status,
      )
    ) {
      throw new ForbiddenException(
        'Este booking no puede ser rechazado',
      );
    }

    const messages =
      await this.negotiationMessageRepository.findByBookingId(booking.id);

    if (messages.some((m) => m.isFinalOffer)) {
      throw new ForbiddenException(
        'Existe una oferta final activa',
      );
    }

    const lastMessage =
      messages.length > 0 ? messages[messages.length - 1] : null;

    if (lastMessage && lastMessage.senderUserId === input.senderUserId) {
      throw new ForbiddenException(
        'No puedes rechazar tras haber respondido',
      );
    }

    if (lastMessage) {
      if (isSameSide(lastMessage.senderRole, input.senderRole)) {
        throw new ForbiddenException(
          'No es tu turno para rechazar la propuesta',
        );
      }
    } else if (!isArtistSide(input.senderRole)) {
      throw new ForbiddenException(
        'No es tu turno para rechazar la propuesta',
      );
    }

    booking.changeStatus(BookingStatus.REJECTED);
    await this.bookingRepository.update(booking);
  }
}
