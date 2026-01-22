import { Module } from '@nestjs/common';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { OutboxRepository } from '@/src/infrastructure/database/repositories/outbox/outbox.repository';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { OutboxWorkerService } from './outbox.worker';

@Module({
  imports: [SupabaseModule],
  providers: [OutboxRepository, ArtistNotificationRepository, OutboxWorkerService],
  exports: [OutboxRepository],
})
export class OutboxModule {}
