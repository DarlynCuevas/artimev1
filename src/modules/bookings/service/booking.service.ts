import { randomUUID } from 'crypto';
import { BookingStatus } from '../booking-status.enum';
import { Booking } from '../booking.entity';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../repositories/booking-repository.token';
import type { BookingRepository } from '../repositories/booking.repository.interface';
import { NegotiationMessage, NegotiationSenderRole } from '../negotiations/negotiation-message.entity';
import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { ArtistCalendarBlockRepository } from '@/src/infrastructure/database/repositories/artist/artist-calendar-block.repository';

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
    private readonly blockRepository: ArtistCalendarBlockRepository,
  ) { }

  /**
   * Obtener bookings del usuario según rol
   */
  async getForUser(
    userContext: AuthenticatedRequest['userContext'],
  ): Promise<Booking[]> {
    if (userContext.venueId) {
      return this.bookingRepository.findByVenueId(userContext.venueId);
    }

    if (userContext.artistId) {
      return this.bookingRepository.findByArtistId(userContext.artistId);
    }
    return [];
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

    venueId?: string;
    promoterId?: string;

    eventId?: string;

    currency: string;
    totalAmount: number;
    start_date: string;

    message?: string;

    senderUserId: string;
    senderRole: NegotiationSenderRole; // 'VENUE' | 'PROMOTER'
  }): Promise<Booking> {
    if (params.senderRole === 'PROMOTER' && !params.eventId) {
      throw new Error(
        'Un promotor debe crear la contratación dentro de un evento',
      );
    }

    await this.ensureDateAvailable(params.artistId, params.start_date);

    const booking = new Booking({
      id: randomUUID(),
      artistId: params.artistId,
      venueId: params.venueId ?? null,
      promoterId: params.promoterId ?? null,
      eventId: params.eventId ?? null,
      status: BookingStatus.PENDING,
      currency: params.currency,
      totalAmount: params.totalAmount,
      start_date: params.start_date,
      //  IMPORTANTE: sin handler al crear
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
    // 3. Crear mensaje inicial de negociación (CLAVE)
    const initialMessage = new NegotiationMessage({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      senderRole: params.senderRole,
      senderUserId: params.senderUserId,
      proposedFee: booking.totalAmount,
      message: params.message,
      isFinalOffer: false,
      createdAt: new Date(),
    });

    // 4. Guardar mensaje
    await this.negotiationMessageRepository.save(
      initialMessage,
    );

    return booking;
  }

  private async ensureDateAvailable(artistId: string, date: string) {
    const conflictBooking = await this.bookingRepository.findConfirmedByArtistAndDate(
      artistId,
      date,
    );

    const { data: block } = await this.blockRepository.findByArtistAndDate(artistId, date);

    if (!conflictBooking && !block) return;

    const suggestions = await this.findAlternativeDates(artistId, date, 7, 3);

    throw new BadRequestException({
      message: 'DATE_NOT_AVAILABLE',
      reason: conflictBooking ? 'BOOKING_CONFLICT' : 'BLOCKED_DAY',
      suggestions,
    });
  }

  private async findAlternativeDates(
    artistId: string,
    date: string,
    windowDays: number,
    maxSuggestions: number,
  ): Promise<string[]> {
    const pivot = new Date(date);
    if (isNaN(pivot.getTime())) return [];

    const results: string[] = [];

    const isFree = async (checkDate: string) => {
      const conflict = await this.bookingRepository.findConfirmedByArtistAndDate(
        artistId,
        checkDate,
      );
      if (conflict) return false;
      const { data: blk } = await this.blockRepository.findByArtistAndDate(artistId, checkDate);
      return !blk;
    };

    for (let offset = 1; offset <= windowDays && results.length < maxSuggestions; offset++) {
      const before = new Date(pivot);
      before.setUTCDate(before.getUTCDate() - offset);
      const beforeIso = before.toISOString().slice(0, 10);
      // Prefer future dates but include previous if free
      const after = new Date(pivot);
      after.setUTCDate(after.getUTCDate() + offset);
      const afterIso = after.toISOString().slice(0, 10);

      if (await isFree(afterIso)) {
        results.push(afterIso);
        if (results.length >= maxSuggestions) break;
      }

      if (await isFree(beforeIso)) {
        results.push(beforeIso);
      }
    }

    return results.slice(0, maxSuggestions);
  }

  async getById(id: string): Promise<Booking | null> {
    return this.bookingRepository.findById(id);
  }
}
/**
async createBooking(params: {
  artistId: string;
  venueId: string;
  promoterId?: string;
  eventId?: string;
  currency: string;
  totalAmount: number;
  start_date: string;
  message?: string;
  // userContext: { role: string; userId: string }
}, userContext: { role: string; userId: string }): Promise<Booking> {
  if (userContext.role === 'PROMOTER' && !params.eventId) {
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
    //  IMPORTANTE: sin handler al crear
    handledByRole: null,
    handledByUserId: null,
    handledAt: null,
    artistStripeAccountId: null,
    managerStripeAccountId: null,
    artimeCommissionPercentage: undefined,
    managerCommissionPercentage: undefined,
    createdAt: new Date(),
  });
  console.log('antes de guardar booking', booking);
  
  await this.bookingRepository.save(booking);
  // 3. Crear mensaje inicial de negociación (CLAVE)
  const initialMessage = new NegotiationMessage({
    id: crypto.randomUUID(),
    bookingId: booking.id,
    senderRole: userContext.role as NegotiationSenderRole, // VENUE o PROMOTER
    senderUserId: userContext.userId,
    proposedFee: booking.totalAmount,
    message: params.message,
    isFinalOffer: false,
    createdAt: new Date(),
  });

  // 4. Guardar mensaje
  await this.negotiationMessageRepository.save(
    initialMessage,
  );

  return booking;
}*/
