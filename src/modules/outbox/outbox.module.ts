import { Module } from '@nestjs/common';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { OutboxRepository } from '../../infrastructure/database/repositories/outbox/outbox.repository';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { OutboxWorkerService } from './outbox.worker';
import { EVENT_REPOSITORY } from '@/src/modules/events/repositories/event.repository.token';
import { SupabaseEventRepository } from '@/src/infrastructure/database/repositories/event/event.supabase.repository';
import { BOOKING_REPOSITORY } from '@/src/modules/bookings/repositories/booking-repository.token';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/bookings/SupabaseBookingRepository';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/src/infrastructure/database/supabase.client';
import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from '@/src/modules/managers/repositories/artist-manager-representation.repository.token';
import { DbArtistManagerRepresentationRepository } from '@/src/infrastructure/database/repositories/manager/artist-manager-representation.repository';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import { DbManagerRepository } from '@/src/infrastructure/database/repositories/manager/db-manager.repository';

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
      provide: ARTIST_MANAGER_REPRESENTATION_REPOSITORY,
      useClass: DbArtistManagerRepresentationRepository,
    },
    {
      provide: MANAGER_REPOSITORY,
      useClass: DbManagerRepository,
    },
    {
      provide: SupabaseClient,
      useValue: supabase,
    },
  ],
  exports: [OutboxRepository],
})
export class OutboxModule {}
