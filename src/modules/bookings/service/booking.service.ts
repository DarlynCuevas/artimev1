import { randomUUID } from 'crypto';
import { BookingStatus } from '../booking-status.enum';
import { Booking } from '../booking.entity';
import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../repositories/booking-repository.token';
import type { BookingRepository } from '../repositories/booking.repository.interface';
import { NegotiationMessage, NegotiationSenderRole } from '../negotiations/negotiation-message.entity';
import { NegotiationMessageRepository } from '@/src/infrastructure/database/repositories/negotiation-message.repository';
import { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { ArtistCalendarBlockRepository } from '@/src/infrastructure/database/repositories/artist/artist-calendar-block.repository';
import { EVENT_INVITATION_REPOSITORY } from '../../events/repositories/event-invitation.repository.token';
import type { EventInvitationRepository } from '../../events/repositories/event-invitation.repository';
import { EVENT_REPOSITORY } from '../../events/repositories/event.repository.token';
import type { EventRepository } from '../../events/repositories/event.repository';
import { OutboxRepository } from '../../../infrastructure/database/repositories/outbox/outbox.repository';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '@/src/modules/managers/repositories/artist-manager-representation.repository.token';
import type { ArtistManagerRepresentationRepository } from '@/src/modules/managers/repositories/artist-manager-representation.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import {
  normalizeArtistBookingConditions,
  type ArtistBookingConditions,
} from '@/src/modules/artists/types/artist-booking-conditions';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
    private readonly blockRepository: ArtistCalendarBlockRepository,
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly eventInvitationRepository: EventInvitationRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
    private readonly outboxRepository: OutboxRepository,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly representationRepository: ArtistManagerRepresentationRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
    private readonly artistNotificationRepository: ArtistNotificationRepository,
  ) { }

  /**
   * Obtener bookings del usuario seg�n rol
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
    if (userContext.promoterId) {
      return this.bookingRepository.findByPromoterId(userContext.promoterId);
    }
    if (userContext.managerId) {
      const reps = await this.representationRepository.findActiveByManager(userContext.managerId);
      const artistIds = reps.map((r) => r.artistId);
      if (!artistIds.length) return [];

      const perArtist = await Promise.all(artistIds.map((id) => this.bookingRepository.findByArtistId(id)));
      return perArtist.flat();
    }
    return [];
  }
  /**
   * Crear booking
   * -----------------------------------------
   * - Siempre en PENDING
   * - SIN handler
   * - SIN negociaci�n activa
   */
  async createBooking(params: {
    artistId: string;

    venueId?: string;
    promoterId?: string;

    eventId?: string;

    currency?: string;
    totalAmount?: number;
    allIn?: boolean;
    artistConditionsSnapshot?: ArtistBookingConditions | null;
    start_date?: string;

    message?: string;

    senderUserId: string;
    senderRole: NegotiationSenderRole; // 'VENUE' | 'PROMOTER'
  }): Promise<Booking> {
    if (params.senderRole === 'PROMOTER' && !params.eventId) {
      throw new Error(
        'Un promotor debe crear la contrataci�n dentro de un evento',
      );
    }

    if (params.eventId) {
      const invitation = await this.eventInvitationRepository.findAccepted({
        eventId: params.eventId,
        artistId: params.artistId,
      });

      if (!invitation) {
        throw new ForbiddenException('ARTIST_NOT_ACCEPTED_FOR_EVENT');
      }

      const event = await this.eventRepository.findById(params.eventId);
      if (!event) {
        throw new BadRequestException('EVENT_NOT_FOUND');
      }

      if (!params.start_date) {
        params.start_date = event.startDate
          ? event.startDate.toISOString().slice(0, 10)
          : undefined;
      }
      if (params.totalAmount === undefined || params.totalAmount === null) {
        params.totalAmount = event.estimatedBudget ?? 0;
      }
      if (!params.currency) {
        params.currency = 'EUR';
      }
    }

    if (!params.start_date || !params.currency || params.totalAmount === undefined || params.totalAmount === null) {
      throw new BadRequestException('MISSING_BOOKING_FIELDS');
    }

    await this.ensureDateAvailable(params.artistId, params.start_date);

  const representation = await this.getRepresentationForArtist(params.artistId);

    const booking = new Booking({
      id: randomUUID(),
      artistId: params.artistId,
      venueId: params.venueId ?? null,
      promoterId: params.promoterId ?? null,
      managerId: representation?.managerId ?? undefined,
      eventId: params.eventId ?? null,
      status: BookingStatus.PENDING,
      currency: params.currency,
      totalAmount: params.totalAmount,
      allIn: Boolean(params.allIn),
      artistConditionsSnapshot: normalizeArtistBookingConditions(params.artistConditionsSnapshot),
      start_date: params.start_date,
      //  IMPORTANTE: sin handler al crear
      handledByRole: null,
      handledByUserId: null,
      handledAt: null,
      artistStripeAccountId: null,
      managerStripeAccountId: null,
      artimeCommissionPercentage: undefined,
      managerCommissionPercentage: representation?.commissionPercentage ?? undefined,
      createdAt: new Date(),
    });

    await this.bookingRepository.save(booking);
    // 3. Crear mensaje inicial de negociaci�n (CLAVE)
    const initialMessage = new NegotiationMessage({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      senderRole: params.senderRole,
      senderUserId: params.senderUserId,
      proposedFee: booking.totalAmount,
      allIn: booking.allIn,
      message: params.message,
      isFinalOffer: false,
      createdAt: new Date(),
    });

    // 4. Guardar mensaje
    await this.negotiationMessageRepository.save(
      initialMessage,
    );

    await this.outboxRepository.enqueue({
      type: 'BOOKING_CREATED',
      payload: {
        bookingId: booking.id,
        artistId: booking.artistId,
        eventId: booking.eventId ?? null,
      },
    });

    // Notificar también al manager si el artista está representado
    await this.notifyManagerIfAny(booking.artistId, {
      bookingId: booking.id,
      eventId: booking.eventId ?? null,
      eventName: null,
      venueName: null,
      date: booking.start_date,
    }, representation);

    return booking;
  }

  private async getRepresentationForArtist(artistId: string) {
    let representation = await this.representationRepository.findActiveByArtist(artistId);
    if (!representation) {
      representation = await this.representationRepository.findLatestVersionByArtist(artistId);
    }
    return representation;
  }

  private async notifyManagerIfAny(
    artistId: string,
    payload: { bookingId: string; eventId: string | null; eventName: string | null; venueName: string | null; date: string | null },
    representationFromCaller?: any,
  ) {
    try {
      const representation = representationFromCaller ?? (await this.getRepresentationForArtist(artistId));
      if (!representation) {
        this.logger.debug(`notifyManagerIfAny: sin representación para artist ${artistId}`);
        return;
      }

      const manager = await this.managerRepository.findById(representation.managerId);
      if (!manager?.userId) {
        this.logger.debug(`notifyManagerIfAny: manager sin userId para artist ${artistId}, manager ${representation.managerId}`);
        return;
      }

      await this.artistNotificationRepository.createManyByUser([
        {
          userId: manager.userId,
          role: 'MANAGER',
          type: 'BOOKING_REQUEST',
          payload: { ...payload, artistId },
        },
      ]);
      this.logger.debug(`notifyManagerIfAny: notificación enviada a manager ${manager.userId} para artist ${artistId}`);
    } catch (err) {
      this.logger.warn(`notifyManagerIfAny fallo para artist ${artistId}: ${(err as Error).message}`);
    }
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
