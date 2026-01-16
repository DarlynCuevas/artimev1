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
  ) {}

  /**
   * Obtener bookings del usuario según rol
   */
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
   * Crear booking
   * ─────────────────────────────
   * - Siempre en PENDING
   * - SIN handler
   * - SIN negociación activa
   */
  async createBooking(params: {
    artistId: string;
    venueId: string;
    promoterId?: string;
    eventId?: string;
    currency: string;
    totalAmount: number;
    start_date: string;
    role: string;
  }): Promise<Booking> {
    if (params.role === 'PROMOTER' && !params.eventId) {
      throw new Error(
        'Un promotor debe crear la contratación dentro de un evento',
      );
    }

    const booking = new Booking({
      id: randomUUID(),

      artistId: params.artistId,
      venueId: params.venueId,
      promoterId: params.promoterId ?? null,
      eventId: params.eventId ?? null,

      status: BookingStatus.PENDING,

      currency: params.currency,
      totalAmount: params.totalAmount,
      start_date: params.start_date,

      // 🔒 IMPORTANTE: sin handler al crear
      handledByRole: null,
      handledByUserId: null,
      handledAt: null,

      artistStripeAccountId: null,
      managerStripeAccountId: null,
      artimeCommissionPercentage: undefined,
      managerCommissionPercentage: undefined,

      createdAt: new Date(),
    });

    await this.bookingRepository.save(booking);
    return booking;
  }

  /**
   * Obtener booking por id
   */
  async getById(id: string): Promise<Booking | null> {
    return this.bookingRepository.findById(id);
  }
}
