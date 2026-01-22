import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OutboxRepository, OutboxEvent } from '@/src/infrastructure/database/repositories/outbox/outbox.repository';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';

@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly outboxRepo: OutboxRepository,
    private readonly artistNotificationRepo: ArtistNotificationRepository,
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
    const { eligibleArtistIds, callId, venueId, venueName, date, city, filters, offeredMaxPrice } = event.payload ?? {};

    if (!Array.isArray(eligibleArtistIds) || eligibleArtistIds.length === 0) {
      this.logger.log(`Event ${event.id} has no eligible artists; skipping fan-out.`);
      return;
    }

    await this.artistNotificationRepo.createMany(
      eligibleArtistIds.map((artistId: string) => ({
        artistId,
        type: 'ARTIST_CALL_CREATED',
        payload: { callId, venueId, venueName, date, city, filters, offeredMaxPrice },
      })),
    );
  }
}
