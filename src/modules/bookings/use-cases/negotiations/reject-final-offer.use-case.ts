import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
import {
  NegotiationSenderRole,
} from '../../negotiations/negotiation-message.entity';
import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { mapSenderToHandlerRole } from '../../domain/booking-handler.mapper';
import { isSameSide, isArtistSideOwnerLocked } from '../../booking-turns';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { VENUE_REPOSITORY } from '@/src/modules/venues/repositories/venue-repository.token';
import type { VenueRepository } from '@/src/modules/venues/repositories/venue.repository.interface';
import { PROMOTER_REPOSITORY } from '@/src/modules/promoter/repositories/promoter-repository.token';
import type { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { notifyBookingCounterpart } from '../../notifications/booking-notifications';

@Injectable()
export class RejectFinalOfferUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
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

    // Asignar handler si aún no existe
    if (!booking.handledByRole) {
      booking = booking.assignHandler({
        role: mapSenderToHandlerRole(input.senderRole),
        userId: input.senderUserId,
        at: new Date(),
      });
    } else if (
      isSameSide(booking.handledByRole, input.senderRole) &&
      booking.handledByRole !== mapSenderToHandlerRole(input.senderRole)
    ) {
      throw new ForbiddenException(
        'Este booking está siendo gestionado por la otra parte',
      );
    }

    // Rechazo definitivo
    booking.changeStatus(BookingStatus.REJECTED);
    await this.bookingRepository.update(booking);

    await notifyBookingCounterpart({
      booking,
      senderRole: input.senderRole,
      type: 'BOOKING_REJECTED',
      notificationsRepo: this.notificationsRepo,
      venueRepository: this.venueRepository,
      promoterRepository: this.promoterRepository,
      managerRepository: this.managerRepository,
    });
  }
}
