import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
import {
  NegotiationMessage,
  NegotiationSenderRole,
} from '../../negotiations/negotiation-message.entity';
import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '../../../managers/repositories/artist-manager-representation.repository.token';
import type { ArtistManagerRepresentationRepository } from '../../../managers/repositories/artist-manager-representation.repository.interface';
import { mapSenderToHandlerRole } from '../../domain/booking-handler.mapper';

@Injectable()
export class SendFinalOfferUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly artistManagerRepository: ArtistManagerRepresentationRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    senderRole: NegotiationSenderRole;
    senderUserId: string;
    senderManagerId?: string | null;
    proposedFee: number;
    message?: string;
  }): Promise<void> {
    let booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) throw new ForbiddenException('Booking not found');

    if (booking.status === BookingStatus.FINAL_OFFER_SENT) {
      throw new ForbiddenException('Ya existe una oferta final');
    }

    const isArtistSide =
      input.senderRole === 'ARTIST' || input.senderRole === 'MANAGER';

    // Venue / Promoter solo durante negociación
    if (
      !isArtistSide &&
      booking.status !== BookingStatus.NEGOTIATING
    ) {
      throw new ForbiddenException(
        'La sala solo puede enviar oferta final durante la negociación',
      );
    }

    // Validar representación del manager
    if (input.senderRole === 'MANAGER') {
      const represents =
        await this.artistManagerRepository.existsActiveRepresentation({
          artistId: booking.artistId,
          managerId: input.senderManagerId ?? input.senderUserId,
        });

      if (!represents) {
        throw new ForbiddenException('Manager no representa al artista');
      }
    }

    // Solo una oferta final
    const messages =
      await this.negotiationMessageRepository.findByBookingId(booking.id);

    if (messages.some((m) => m.isFinalOffer)) {
      throw new ForbiddenException('Ya existe una oferta final');
    }

    // Handler solo para lado artista
    if (isArtistSide) {
      const handlerRole = mapSenderToHandlerRole(input.senderRole);

      if (!booking.handledByRole) {
        booking = booking.assignHandler({
          role: handlerRole,
          userId: input.senderUserId,
          at: new Date(),
        });
      } else if (booking.handledByRole !== handlerRole) {
        throw new ForbiddenException(
          'Este booking está siendo gestionado por la otra parte',
        );
      }
    }

    const finalOffer = new NegotiationMessage({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      senderRole: input.senderRole,
      senderUserId: input.senderUserId,
      proposedFee: input.proposedFee,
      message: input.message,
      isFinalOffer: true,
      createdAt: new Date(),
    });

    await this.negotiationMessageRepository.save(finalOffer);

    booking.changeStatus(BookingStatus.FINAL_OFFER_SENT);
    await this.bookingRepository.update(booking);
  }
}
