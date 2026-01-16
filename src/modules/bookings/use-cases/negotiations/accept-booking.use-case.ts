import { ForbiddenException, Inject, Injectable } from '@nestjs/common';



import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { BookingStatus } from '../../booking-status.enum';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';

@Injectable()
export class AcceptBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    senderUserId: string;
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
        'Este booking no puede ser aceptado',
      );
    }

    // No aceptar si existe oferta final
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
        'No puedes aceptar tras haber respondido',
      );
    }

    booking.changeStatus(BookingStatus.ACCEPTED);
    await this.bookingRepository.update(booking);
  }
}
