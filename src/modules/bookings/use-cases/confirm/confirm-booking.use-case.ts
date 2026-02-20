import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { BOOKING_REPOSITORY } from "../../repositories/booking-repository.token";
import type { BookingRepository } from "../../repositories/booking.repository.interface";
import { GenerateContractUseCase } from "@/src/modules/contracts/use-cases/generate-contract.use-case";
import { BookingStatus } from "../../booking-status.enum";
import { mapSenderToHandlerRole } from "../../domain/booking-handler.mapper";
import { NegotiationSenderRole } from "../../negotiations/negotiation-message.entity";
import { NegotiationMessage } from "../../negotiations/negotiation-message.entity";
import { NegotiationMessageRepository } from "@/src/infrastructure/database/repositories/negotiation-message.repository";
import type { ArtistManagerRepresentationRepository } from "@/src/modules/managers/repositories/artist-manager-representation.repository.interface";
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from "@/src/modules/managers/repositories/artist-manager-representation.repository.token";
import { isArtistSide, isSameSide, isArtistSideOwnerLocked } from "../../booking-turns";

@Injectable()
export class AcceptBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly artistManagerRepository: ArtistManagerRepresentationRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
    private readonly generateContractUseCase: GenerateContractUseCase,
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

    // Validar estado: se puede aceptar sin negociación previa
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.NEGOTIATING &&
      booking.status !== BookingStatus.FINAL_OFFER_SENT
    ) {
      throw new ForbiddenException(
        'La contratación no puede aceptarse en el estado actual',
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

    // Validar turno
    const lastMessage =
      await this.negotiationMessageRepository.findLastByBookingId(
        booking.id,
      );

    if (lastMessage) {
      if (isSameSide(lastMessage.senderRole, input.senderRole)) {
        throw new ForbiddenException(
          'No es tu turno para aceptar la propuesta',
        );
      }
    } else if (!isArtistSide(input.senderRole)) {
      // En PENDING sin mensajes, solo artista/manager pueden aceptar
      throw new ForbiddenException(
        'No es tu turno para aceptar la propuesta',
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

    // Si no hay oferta final explícita, crear una implícita para trazabilidad
    if (booking.status !== BookingStatus.FINAL_OFFER_SENT) {
      const messages =
        await this.negotiationMessageRepository.findByBookingId(booking.id);
      const hasFinalOffer = messages.some((m) => m.isFinalOffer);

      const lastOffer = [...messages]
        .reverse()
        .find(
          (m) =>
            typeof m.proposedFee === 'number' || m.isFinalOffer,
        );

      const acceptedAmount =
        typeof lastOffer?.proposedFee === 'number'
          ? lastOffer.proposedFee
          : booking.totalAmount;

      if (acceptedAmount == null || acceptedAmount <= 0) {
        throw new ForbiddenException('No hay importe para cerrar la oferta final');
      }

      if (!hasFinalOffer) {
        const implicitFinalOffer = new NegotiationMessage({
          id: crypto.randomUUID(),
          bookingId: booking.id,
          senderRole: input.senderRole,
          senderUserId: input.senderUserId,
          proposedFee: acceptedAmount,
          message: 'Oferta final implícita por aceptación',
          isFinalOffer: true,
          createdAt: new Date(),
        });
        await this.negotiationMessageRepository.save(implicitFinalOffer);
      }

      booking.updateTotalAmount(acceptedAmount);

      booking.changeStatus(BookingStatus.FINAL_OFFER_SENT);
    }

    // Cierre contractual
    booking.changeStatus(BookingStatus.ACCEPTED);
    await this.bookingRepository.update(booking);

    // Generar contrato
    await this.generateContractUseCase.execute(booking.id);
  }
}
