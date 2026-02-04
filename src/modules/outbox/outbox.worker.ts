import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { OutboxRepository, OutboxEvent } from '@/src/infrastructure/database/repositories/outbox/outbox.repository';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { EVENT_REPOSITORY } from '@/src/modules/events/repositories/event.repository.token';
import type { EventRepository } from '@/src/modules/events/repositories/event.repository';

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
      this.logger.log(`Event ${event.id} has no eligible artists; skipping fan-out.`);
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
  }

  private async handleBookingCreated(event: OutboxEvent) {
    const { artistId, bookingId, eventId } = event.payload ?? {};

    if (!artistId || !bookingId) {
      this.logger.warn(`Event ${event.id} missing payload for BOOKING_CREATED`);
      return;
    }

    await this.artistNotificationRepo.createMany([
      {
        artistId,
        type: 'BOOKING_REQUEST',
        payload: { bookingId, eventId },
      },
    ]);
  }
}
