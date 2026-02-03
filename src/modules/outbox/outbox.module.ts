import { Module } from '@nestjs/common';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { OutboxRepository } from '@/src/infrastructure/database/repositories/outbox/outbox.repository';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { OutboxWorkerService } from './outbox.worker';
import { EVENT_REPOSITORY } from '@/src/modules/events/repositories/event.repository.token';
import { SupabaseEventRepository } from '@/src/infrastructure/database/repositories/event/event.supabase.repository';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/src/infrastructure/database/supabase.client';

@Module({
  imports: [SupabaseModule],
  providers: [
    OutboxRepository,
    ArtistNotificationRepository,
    OutboxWorkerService,
    {
      provide: EVENT_REPOSITORY,
      useClass: SupabaseEventRepository,
    },
    {
      provide: SupabaseClient,
      useValue: supabase,
    },
  ],
  exports: [OutboxRepository],
})
export class OutboxModule {}
