import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
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
import { isArtistSide, isSameSide, isArtistSideOwnerLocked } from '../../booking-turns';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { VENUE_REPOSITORY } from '@/src/modules/venues/repositories/venue-repository.token';
import type { VenueRepository } from '@/src/modules/venues/repositories/venue.repository.interface';
import { PROMOTER_REPOSITORY } from '@/src/modules/promoter/repositories/promoter-repository.token';
import type { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { notifyBookingCounterpart } from '../../notifications/booking-notifications';

@Injectable()
export class SendFinalOfferUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly artistManagerRepository: ArtistManagerRepresentationRepository,
    private readonly notificationsRepo: ArtistNotificationRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    senderRole: NegotiationSenderRole;
    senderUserId: string;
    senderManagerId?: string | null;
    proposedFee: number;
    message?: string;
  }): Promise<void> {
    if (input.proposedFee == null || input.proposedFee <= 0) {
      throw new BadRequestException('La oferta final requiere un importe válido');
    }

    let booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) throw new ForbiddenException('Booking not found');

    if (booking.status === BookingStatus.FINAL_OFFER_SENT) {
      throw new ForbiddenException('Ya existe una oferta final');
    }

    const senderIsArtistSide = isArtistSide(input.senderRole);

    // Venue / Promoter solo durante negociación
    if (
      !senderIsArtistSide &&
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

    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (isSameSide(lastMessage.senderRole, input.senderRole)) {
        throw new ForbiddenException('No es tu turno para enviar oferta final');
      }
    } else if (!senderIsArtistSide) {
      throw new ForbiddenException('No es tu turno para enviar oferta final');
    }

    // Handler solo para lado artista
    if (senderIsArtistSide) {
      const handlerRole = mapSenderToHandlerRole(input.senderRole);

      if (
        isArtistSideOwnerLocked({
          currentRole: input.senderRole,
          currentUserId: input.senderUserId,
          ownerRole: booking.handledByRole,
          ownerUserId: booking.handledByUserId,
        })
      ) {
        throw new ForbiddenException(
          'Este booking está siendo gestionado por la otra parte',
        );
      }

      if (!booking.handledByRole) {
        booking = booking.assignHandler({
          role: handlerRole,
          userId: input.senderUserId,
          at: new Date(),
        });
      } else if (
        isSameSide(booking.handledByRole, handlerRole) &&
        booking.handledByRole !== handlerRole
      ) {
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

    await notifyBookingCounterpart({
      booking,
      senderRole: input.senderRole,
      type: 'FINAL_OFFER_SENT',
      notificationsRepo: this.notificationsRepo,
      venueRepository: this.venueRepository,
      promoterRepository: this.promoterRepository,
      managerRepository: this.managerRepository,
    });
  }
}
