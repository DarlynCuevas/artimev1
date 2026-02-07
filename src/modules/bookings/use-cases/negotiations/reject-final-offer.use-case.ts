import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
import {
  NegotiationSenderRole,
} from '../../negotiations/negotiation-message.entity';
import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';

@Injectable()
export class RejectFinalOfferUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    senderUserId: string;
    senderRole: NegotiationSenderRole;
    senderManagerId?: string | null;
  }): Promise<void> {

    let booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    // Debe existir una oferta final
    const lastMessage =
      await this.negotiationMessageRepository.findLastByBookingId(
        booking.id,
      );

    if (!lastMessage || !lastMessage.isFinalOffer) {
      throw new ForbiddenException(
        'No hay una oferta final para rechazar',
      );
    }

    // No puedes rechazar tu propia oferta final
    if (lastMessage.senderUserId === input.senderUserId) {
      throw new ForbiddenException(
        'No puedes rechazar tu propia oferta final',
      );
    }

    // El booking debe estar en estado FINAL_OFFER_SENT
    if (booking.status !== BookingStatus.FINAL_OFFER_SENT) {
      throw new ForbiddenException(
        'El booking no está en oferta final',
      );
    }

    const isArtistSide =
      input.senderRole === 'ARTIST' || input.senderRole === 'MANAGER';

    if (isArtistSide) {
      if (!booking.actorUserId) {
        booking = booking.setActor(input.senderUserId);
      } else if (booking.actorUserId !== input.senderUserId) {
        throw new ForbiddenException(
          'Otro representante del artista está gestionando esta negociación',
        );
      }
    }

    // Rechazo definitivo
    booking.changeStatus(BookingStatus.REJECTED);
    await this.bookingRepository.update(booking);
  }
}
