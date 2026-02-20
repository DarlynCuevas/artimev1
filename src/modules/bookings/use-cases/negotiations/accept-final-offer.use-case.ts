import {
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
import { NegotiationMessage, NegotiationSenderRole } from '../../negotiations/negotiation-message.entity';
import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { mapSenderToHandlerRole } from '../../domain/booking-handler.mapper';
import { isSameSide, isArtistSideOwnerLocked } from '../../booking-turns';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '../../../managers/repositories/artist-manager-representation.repository.token';
import type { ArtistManagerRepresentationRepository } from '../../../managers/repositories/artist-manager-representation.repository.interface';
import { GenerateContractUseCase } from '@/src/modules/contracts/use-cases/generate-contract.use-case';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { VENUE_REPOSITORY } from '@/src/modules/venues/repositories/venue-repository.token';
import type { VenueRepository } from '@/src/modules/venues/repositories/venue.repository.interface';
import { PROMOTER_REPOSITORY } from '@/src/modules/promoter/repositories/promoter-repository.token';
import type { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { notifyBookingCounterpart } from '../../notifications/booking-notifications';

@Injectable()
export class AcceptFinalOfferUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly artistManagerRepository: ArtistManagerRepresentationRepository,
    private readonly generateContractUseCase: GenerateContractUseCase,
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
  }): Promise<void> {
    let booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    // Solo se puede aceptar una oferta final explícita
    if (booking.status !== BookingStatus.FINAL_OFFER_SENT) {
      throw new ForbiddenException(
        'No hay una oferta final pendiente de aceptar',
      );
    }

    // Validar manager
    if (input.senderRole === 'MANAGER') {
      const represents =
        await this.artistManagerRepository.existsActiveRepresentation({
          artistId: booking.artistId,
          managerId: input.senderManagerId ?? input.senderUserId,
        });

      if (!represents) {
        throw new ForbiddenException(
          'Manager does not represent this artist',
        );
      }
    }

    // Cargar mensajes y validar oferta final
    const messages =
      await this.negotiationMessageRepository.findByBookingId(
        booking.id,
      );

    const finalOffer = messages.find((m) => m.isFinalOffer);

    if (!finalOffer) {
      throw new ForbiddenException(
        'No existe una oferta final para aceptar',
      );
    }

    if (finalOffer.proposedFee == null) {
      throw new ForbiddenException(
        'La oferta final no tiene importe',
      );
    }

    // Validar handler
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

    // ACEPTACIÓN REAL
    booking.updateTotalAmount(finalOffer.proposedFee);
    booking.changeStatus(BookingStatus.ACCEPTED);
    await this.bookingRepository.update(booking);

    // Generar contrato
    await this.generateContractUseCase.execute(booking.id);

    await notifyBookingCounterpart({
      booking,
      senderRole: input.senderRole,
      type: 'BOOKING_ACCEPTED',
      notificationsRepo: this.notificationsRepo,
      venueRepository: this.venueRepository,
      promoterRepository: this.promoterRepository,
      managerRepository: this.managerRepository,
    });
  }
}
