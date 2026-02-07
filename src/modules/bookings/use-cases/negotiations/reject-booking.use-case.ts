import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
import { NegotiationSenderRole } from '../../negotiations/negotiation-message.entity';

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
    let booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    const isArtistSide =
      input.senderRole === NegotiationSenderRole.ARTIST ||
      input.senderRole === NegotiationSenderRole.MANAGER;

    if (isArtistSide) {
      if (!booking.actorUserId) {
        booking = booking.setActor(input.senderUserId);
      } else if (booking.actorUserId !== input.senderUserId) {
        throw new ForbiddenException(
          'Otro representante del artista está gestionando esta negociación',
        );
      }
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

    booking.changeStatus(BookingStatus.REJECTED);
    await this.bookingRepository.update(booking);
  }
}
