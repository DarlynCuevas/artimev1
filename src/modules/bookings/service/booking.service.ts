// booking.service.ts

// booking.service.ts

import { randomUUID } from 'crypto';
import { BookingStatus } from '../booking-status.enum';
import { Booking } from '../booking.entity';
import { Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../repositories/booking-repository.token';
import type { BookingRepository } from '../repositories/booking.repository.interface';



@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) { }

  /**
   * Cambia el estado de un booking existente
   * (lógica ya existente)
   */
  changeStatus(
    booking: Booking,
    nextStatus: BookingStatus,
  ): Booking {
    booking.changeStatus(nextStatus);
    return booking;
  }

  async getForUser(id: string, role: string): Promise<Booking[]> {
  switch (role) {
    case 'ARTIST':
      return this.bookingRepository.findByArtistId(id);

    case 'VENUE':
      return this.bookingRepository.findByVenueId(id);

    case 'MANAGER':
      return this.bookingRepository.findByManagerId(id);

    default:
      return [];
  }
}

  /**
   * Crea un nuevo booking (flujo oficial)
   */

  async createBooking(params: {
    artistId: string;
    venueId: string;
    promoterId?: string;
    eventId?: string;
    currency: string;
    totalAmount: number;
    start_date: string;
  }): Promise<Booking> {
    const booking = new Booking({
      id: randomUUID(),
      artistId: params.artistId,
      venueId: params.venueId,
      promoterId: params.promoterId ?? null,
      eventId: params.eventId ?? null,
      status: BookingStatus.DRAFT,
      artistStripeAccountId: null,
      artimeCommissionPercentage: undefined,
      currency: params.currency,
      totalAmount: params.totalAmount,
      createdAt: new Date(),
      start_date: params.start_date,
    });

    await this.bookingRepository.save(booking);
 
    return booking;
  }

  async getById(id: string): Promise<Booking | null> {
    return this.bookingRepository.findById(id);
  }
}