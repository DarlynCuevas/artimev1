import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { BOOKING_REPOSITORY } from "../../repositories/booking-repository.token";
import type { BookingRepository } from "../../repositories/booking.repository.interface";
import { GenerateContractUseCase } from "@/src/modules/contracts/use-cases/generate-contract.use-case";
import { BookingStatus } from "../../booking-status.enum";
import { mapSenderToHandlerRole } from "../../domain/booking-handler.mapper";
import { NegotiationSenderRole } from "../../negotiations/negotiation-message.entity";
import type { ArtistManagerRepresentationRepository } from "@/src/modules/managers/repositories/artist-manager-representation.repository.interface";
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from "@/src/modules/managers/repositories/artist-manager-representation.repository.token";

@Injectable()
export class AcceptBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly artistManagerRepository: ArtistManagerRepresentationRepository,
    private readonly generateContractUseCase: GenerateContractUseCase,
  ) {}

  async execute(input: {
    bookingId: string;
    senderRole: NegotiationSenderRole;
    senderUserId: string;
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    // Validar estado: se puede aceptar sin negociación previa
    if (
      booking.status !== BookingStatus.PENDING &&
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
          managerId: input.senderUserId,
        });

      if (!represents) {
        throw new ForbiddenException(
          'Manager does not represent this artist',
        );
      }
    }

    // Validar handler
    const handlerRole = mapSenderToHandlerRole(input.senderRole);

    if (!booking.handledByRole) {
      booking.assignHandler({
        role: handlerRole,
        userId: input.senderUserId,
        at: new Date(),
      });
    } else if (booking.handledByRole !== handlerRole) {
      throw new ForbiddenException(
        'Este booking está siendo gestionado por la otra parte',
      );
    }

    // Cierre contractual
    booking.changeStatus(BookingStatus.ACCEPTED);
    await this.bookingRepository.update(booking);

    // Generar contrato
    await this.generateContractUseCase.execute(booking.id);
  }
}
