import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { OutboxRepository, OutboxEvent } from '@/src/infrastructure/database/repositories/outbox/outbox.repository';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { EVENT_REPOSITORY } from '@/src/modules/events/repositories/event.repository.token';
import type { EventRepository } from '@/src/modules/events/repositories/event.repository';
import { BOOKING_REPOSITORY } from '@/src/modules/bookings/repositories/booking-repository.token';
import type { BookingRepository } from '@/src/modules/bookings/repositories/booking.repository.interface';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '@/src/modules/managers/repositories/artist-manager-representation.repository.token';
import type { ArtistManagerRepresentationRepository } from '@/src/modules/managers/repositories/artist-manager-representation.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';

@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly outboxRepo: OutboxRepository,
    private readonly artistNotificationRepo: ArtistNotificationRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    @Inject(ARTIST_MANAGER_REPRESENTATION_REPOSITORY)
    private readonly representationRepository: ArtistManagerRepresentationRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
  ) {}

  onModuleInit() {
    // Poll every 5 seconds; lightweight and resilient.
    this.timer = setInterval(() => this.tick(), 5_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick() {
    if (this.running) return;
    this.running = true;

    try {
      const pending = await this.outboxRepo.fetchPending(10);
      for (const event of pending) {
        await this.processEvent(event);
      }
    } catch (err) {
      this.logger.error('Outbox tick failed', err as Error);
    } finally {
      this.running = false;
    }
  }

  private async processEvent(event: OutboxEvent) {
    let processingEvent = event;

    try {
      processingEvent = await this.outboxRepo.markProcessing(event.id, event.attempt_count);
    } catch (err) {
      this.logger.error(`Mark processing failed for event ${event.id}`, err as Error);
      return;
    }

    try {
      switch (processingEvent.type) {
        case 'ARTIST_CALL_CREATED':
          await this.handleArtistCallCreated(processingEvent);
          break;
        case 'EVENT_INVITATION_CREATED':
          await this.handleEventInvitationCreated(processingEvent);
          break;
        case 'BOOKING_CREATED':
          await this.handleBookingCreated(processingEvent);
          break;
        case 'REPRESENTATION_REQUEST_CREATED':
          await this.handleRepresentationRequestCreated(processingEvent);
          break;
        case 'REPRESENTATION_REQUEST_RESOLVED':
          await this.handleRepresentationRequestResolved(processingEvent);
          break;
        default:
          this.logger.warn(`Unhandled outbox event type: ${processingEvent.type}`);
      }

      await this.outboxRepo.markProcessed(processingEvent.id);
    } catch (err) {
      this.logger.error(`Processing failed for event ${processingEvent.id}`, err as Error);
      await this.outboxRepo.markFailed(processingEvent.id, processingEvent.attempt_count);
    }
  }

  private async handleArtistCallCreated(event: OutboxEvent) {
    const {
      eligibleArtistIds,
      callId,
      venueId,
      venueName,
      date,
      city,
      filters,
      offeredMaxPrice,
      offeredMinPrice,
    } = event.payload ?? {};

    if (!Array.isArray(eligibleArtistIds) || eligibleArtistIds.length === 0) {
      // ...existing code...
      return;
    }

    await this.artistNotificationRepo.createMany(
      eligibleArtistIds.map((artistId: string) => ({
        artistId,
        type: 'ARTIST_CALL_CREATED',
        payload: { callId, venueId, venueName, date, city, filters, offeredMaxPrice, offeredMinPrice },
      })),
    );
  }

  private async handleEventInvitationCreated(event: OutboxEvent) {
    const { artistId, eventId, invitationId } = event.payload ?? {};

    if (!artistId || !eventId || !invitationId) {
      this.logger.warn(`Event ${event.id} missing payload for EVENT_INVITATION_CREATED`);
      return;
    }

    const eventEntity = await this.eventRepository.findById(eventId);
    const eventName = eventEntity?.name ?? null;

    await this.artistNotificationRepo.createMany([
      {
        artistId,
        type: 'EVENT_INVITATION_CREATED',
        payload: { eventId, invitationId, eventName },
      },
    ]);

    const managerUserId = await this.getActiveManagerUserId(artistId);
    if (managerUserId) {
      await this.artistNotificationRepo.createManyByUser([
        {
          userId: managerUserId,
          role: 'MANAGER',
          type: 'EVENT_INVITATION_CREATED',
          payload: { eventId, invitationId, eventName, artistId },
        },
      ]);
    }
  }

  private async handleBookingCreated(event: OutboxEvent) {
    const { artistId, bookingId, eventId } = event.payload ?? {};

    if (!artistId || !bookingId) {
      this.logger.warn(`Event ${event.id} missing payload for BOOKING_CREATED`);
      return;
    }

    let eventName: string | null = null;
    let venueName: string | null = null;
    let bookingDate: string | null = null;

    try {
      const booking = await this.bookingRepository.findById(bookingId);
      eventName = booking?.eventName ?? null;
      venueName = booking?.venueName ?? null;
      bookingDate = booking?.start_date ?? null;
    } catch (err) {
      this.logger.warn(`Could not load booking ${bookingId} for BOOKING_CREATED payload enrichment`);
    }

    // Fallback to event lookup if booking lacks name
    if (!eventName && eventId) {
      try {
        const evt = await this.eventRepository.findById(eventId);
        eventName = evt?.name ?? null;
      } catch (err) {
        this.logger.warn(`Could not load event ${eventId} for BOOKING_CREATED payload enrichment`);
      }
    }

    await this.artistNotificationRepo.createMany([
      {
        artistId,
        type: 'BOOKING_REQUEST',
        payload: { bookingId, eventId, eventName, venueName, date: bookingDate },
      },
    ]);
  }

  private async handleRepresentationRequestCreated(event: OutboxEvent) {
    const { artistId, requestId, managerId, managerName, commissionPercentage } = event.payload ?? {};

    if (!artistId || !requestId || !managerId) {
      this.logger.warn(`Event ${event.id} missing payload for REPRESENTATION_REQUEST_CREATED`);
      return;
    }

    await this.artistNotificationRepo.createMany([
      {
        artistId,
        type: 'REPRESENTATION_REQUEST_CREATED',
        payload: {
          requestId,
          managerId,
          managerName: managerName ?? null,
          commissionPercentage: commissionPercentage ?? null,
        },
      },
    ]);
  }

  private async handleRepresentationRequestResolved(event: OutboxEvent) {
    const { managerUserId, result, requestId, artistId, managerId, contractId } = event.payload ?? {};

    if (!managerUserId || !result || !requestId) {
      this.logger.warn(`Event ${event.id} missing payload for REPRESENTATION_REQUEST_RESOLVED`);
      return;
    }

    await this.artistNotificationRepo.createManyByUser([
      {
        userId: managerUserId,
        role: 'MANAGER',
        type: 'REPRESENTATION_REQUEST_RESOLVED',
        payload: {
          result,
          requestId,
          artistId: artistId ?? null,
          managerId: managerId ?? null,
          contractId: contractId ?? null,
        },
      },
    ]);
  }

  private async getActiveManagerUserId(artistId: string): Promise<string | null> {
    if (!artistId) return null;

    try {
      let representation = await this.representationRepository.findActiveByArtist(artistId);
      if (!representation) {
        representation = await this.representationRepository.findLatestVersionByArtist(artistId);
        if (!representation) {
          this.logger.debug(`Outbox: sin representación para artist ${artistId}`);
          return null;
        }
      }

      const manager = await this.managerRepository.findById(representation.managerId);
      if (!manager?.userId) {
        this.logger.debug(`Outbox: manager sin userId para artist ${artistId}, manager ${representation.managerId}`);
        return null;
      }

      return manager.userId;
    } catch (err) {
      this.logger.warn(`Could not resolve manager for artist ${artistId}: ${(err as Error).message}`);
      return null;
    }
  }
}
