import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStatus } from '../../booking-status.enum';
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
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) throw new ForbiddenException('Booking not found');

    if (booking.status !== BookingStatus.FINAL_OFFER_SENT) {
      throw new ForbiddenException(
        'No hay ninguna oferta final para rechazar',
      );
    }

    const messages =
      await this.negotiationMessageRepository.findByBookingId(booking.id);

    const finalOffer = messages.find((m) => m.isFinalOffer);
    if (!finalOffer) {
      throw new ForbiddenException('Oferta final no encontrada');
    }

    if (finalOffer.senderUserId === input.senderUserId) {
      throw new ForbiddenException(
        'No puedes rechazar tu propia oferta',
      );
    }

    booking.changeStatus(BookingStatus.REJECTED);
    await this.bookingRepository.update(booking);
  }
}
