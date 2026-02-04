import { Module } from '@nestjs/common';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { OutboxRepository } from '@/src/infrastructure/database/repositories/outbox/outbox.repository';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { OutboxWorkerService } from './outbox.worker';
import { EVENT_REPOSITORY } from '@/src/modules/events/repositories/event.repository.token';
import { SupabaseEventRepository } from '@/src/infrastructure/database/repositories/event/event.supabase.repository';
import { BOOKING_REPOSITORY } from '@/src/modules/bookings/repositories/booking-repository.token';
import { SupabaseBookingRepository } from '@/src/infrastructure/database/repositories/bookings/SupabaseBookingRepository ';
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
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
    {
      provide: SupabaseClient,
      useValue: supabase,
    },
  ],
  exports: [OutboxRepository],
})
export class OutboxModule {}
