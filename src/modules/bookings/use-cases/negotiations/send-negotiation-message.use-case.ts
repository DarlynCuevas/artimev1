import {
  Inject,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
import {
  NegotiationMessage,
  NegotiationSenderRole,
} from '../../negotiations/negotiation-message.entity';
import { NegotiationMessageRepository } from '../../../../infrastructure/database/repositories/negotiation-message.repository';
import { mapSenderToHandlerRole } from '../../domain/booking-handler.mapper';

@Injectable()
export class SendNegotiationMessageUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
  ) { }

  async execute(input: {
    bookingId: string;
    senderRole: NegotiationSenderRole;
    senderUserId: string;
    senderManagerId?: string | null;
    message?: string;
    proposedFee?: number;
    isFinalOffer?: boolean;
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    /**
     *  Estados no negociables
     */
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new ForbiddenException('No se puede negociar este booking');
    }

    const isVenueSide =
      input.senderRole === 'VENUE' ||
      input.senderRole === 'PROMOTER';

    const isArtistSide =
      input.senderRole === 'ARTIST' ||
      input.senderRole === 'MANAGER';

    if (
      booking.status === BookingStatus.NEGOTIATING &&
      input.proposedFee == null
    ) {
      throw new BadRequestException(
        'Una contraoferta debe incluir un importe',
      );
    }

    /**
     *  Venue / Promoter solo 1 mensaje inicial en PENDING
     */
    if (isVenueSide && booking.status === BookingStatus.PENDING) {
      const existingMessages =
        await this.negotiationMessageRepository.findByBookingId(
          booking.id,
        );

      if (existingMessages.length > 0) {
        throw new ForbiddenException(
          'Debes esperar a que el artista o su manager respondan',
        );
      }
    }

    /**
     *  Turnos (nadie puede hablar dos veces seguidas)
     */
    const lastMessage =
      await this.negotiationMessageRepository.findLastByBookingId(
        booking.id,
      );

    if (
      lastMessage &&
      lastMessage.senderRole === input.senderRole &&
      !input.isFinalOffer
    ) {
      throw new ForbiddenException(
        'Debes esperar a que la otra parte responda',
      );
    }

    /**
     * 🎤 SOLO ARTISTA / MANAGER gestionan el booking
     */
    if (isArtistSide) {
      const handlerRole = mapSenderToHandlerRole(input.senderRole);

      if (!booking.handledByRole) {
        const updatedBooking = booking.assignHandler({
          role: handlerRole,
          userId: input.senderUserId,
        });
        await this.bookingRepository.update(updatedBooking);
      } else if (
        booking.handledByRole !== handlerRole ||
        booking.handledByUserId !== input.senderUserId
      ) {
        throw new ForbiddenException(
          'Este booking está siendo gestionado por la otra parte',
        );
      }

      /**
       * ⏩ ARTISTA responde → pasa a NEGOTIATING
       */
      if (booking.status === BookingStatus.PENDING) {
        booking.changeStatus(BookingStatus.NEGOTIATING);
        await this.bookingRepository.update(booking);
      }
    }

    /**
     * 💾 Guardar mensaje
     */
    console.log('[NEGOTIATION USECASE] Creando NegotiationMessage:', {
      bookingId: booking.id,
      senderRole: input.senderRole,
      senderUserId: input.senderUserId,
      message: input.message,
      proposedFee: input.proposedFee,
      isFinalOffer: input.isFinalOffer ?? false,
    });
    const negotiationMessage = new NegotiationMessage({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      senderRole: input.senderRole,
      senderUserId: input.senderUserId,
      message: input.message,
      proposedFee: input.proposedFee,
      isFinalOffer: input.isFinalOffer ?? false,
      createdAt: new Date(),
    });
    console.log('[NEGOTIATION USECASE] NegotiationMessage instanciado:', negotiationMessage);
    await this.negotiationMessageRepository.save(negotiationMessage);
    console.log('[NEGOTIATION USECASE] NegotiationMessage guardado en repositorio');

    /**
     * 🔚 Oferta final
     */
    if (input.isFinalOffer) {
      booking.changeStatus(BookingStatus.FINAL_OFFER_SENT);
      await this.bookingRepository.update(booking);
    }
  }
}
