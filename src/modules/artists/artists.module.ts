// removed duplicate forwardRef import
import { Module, forwardRef } from '@nestjs/common';
import { PromotersModule } from '../promoter/promoter.module';
import { ManagersModule } from '../managers/managers.module';

import { ArtistsController } from './controllers/artists.controller';
import { ArtistsService } from './services/artists.service';
import { ARTIST_REPOSITORY } from './repositories/artist-repository.token';
import { DbArtistRepository } from '../../infrastructure/database/repositories/artist/artist.repository';
import { DiscoverArtistsUseCase } from './use-cases/discover-artists.usecase';
import { VenuesModule } from '../venues/venues.module';
import { GetArtistDashboardUseCase } from './use-cases/dashboard-artist.usecase';
import { BookingsModule } from '../bookings/bookings.module';
import { ArtistCalendarController } from './controllers/artist-calendar.controller';
import { CreateArtistCalendarBlockUseCase } from './use-cases/calendar/create-artist-calendar-block.usecase';
import { ArtistCalendarBlockRepository } from '@/src/infrastructure/database/repositories/artist/artist-calendar-block.repository';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { GetArtistCalendarBlocksUseCase } from './use-cases/calendar/get-artist-calendar-blocks.usecase';
import { DeleteArtistCalendarBlockUseCase } from './use-cases/calendar/delete-artist-calendar-block.usecase';
import { GetArtistBookingByDateUseCase } from './use-cases/calendar/get-artist-booking-by-date.usecase';
import { GetArtistBlocksByArtistIdUseCase } from './use-cases/calendar/get-artist-blocks-by-artist-id.usecase';
import { ArtistCallController } from './controllers/artist-call.controller';
import { RespondArtistCallUseCase } from './use-cases/respond-artist-call.usecase';
import { ArtistNotificationsController } from './controllers/artist-notifications.controller';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { EVENT_INVITATION_REPOSITORY } from '../events/repositories/event-invitation.repository.token';
import { SupabaseEventInvitationRepository } from '@/src/infrastructure/database/repositories/event/event-invitation.supabase.repository';
import { GetArtistEventInvitationsQuery } from './queries/get-artist-event-invitations.query';
import { EVENT_REPOSITORY } from '../events/repositories/event.repository.token';
import { SupabaseEventRepository } from '@/src/infrastructure/database/repositories/event/event.supabase.repository';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/src/infrastructure/database/supabase.client';
import { UserContextModule } from '../auth/user-context/user-context.module';
import { REPRESENTATION_CONTRACT_REPOSITORY, REPRESENTATION_REQUEST_REPOSITORY } from '../representations/repositories/representation-repository.tokens';
import { SupabaseRepresentationRequestRepository } from '@/src/infrastructure/database/repositories/representation/supabase-representation-request.repository';
import { SupabaseRepresentationContractRepository } from '@/src/infrastructure/database/repositories/representation/supabase-representation-contract.repository';
import { MANAGER_REPOSITORY } from '../managers/repositories/manager-repository.token';
import { DbManagerRepository } from '@/src/infrastructure/database/repositories/manager/db-manager.repository';
import { UsersModule } from '../users/users.module';
import { ArtistGalleryRepository } from '@/src/infrastructure/database/repositories/artist/artist-gallery.repository';
import { ArtistVideoRepository } from '@/src/infrastructure/database/repositories/artist/artist-video.repository';


@Module({
  imports: [SupabaseModule, forwardRef(() => VenuesModule), forwardRef(() => BookingsModule), forwardRef(() => PromotersModule), forwardRef(() => ManagersModule), forwardRef(() => UserContextModule), forwardRef(() => UsersModule)],
  controllers: [ArtistsController, ArtistCalendarController, ArtistCallController, ArtistNotificationsController],
  providers: [
    ArtistsService,
    DiscoverArtistsUseCase,
    GetArtistDashboardUseCase,
    GetArtistEventInvitationsQuery,
    CreateArtistCalendarBlockUseCase,
    GetArtistCalendarBlocksUseCase,
    DeleteArtistCalendarBlockUseCase,
    GetArtistBookingByDateUseCase,
    GetArtistBlocksByArtistIdUseCase,
    RespondArtistCallUseCase,
    ArtistCalendarBlockRepository,
    ArtistNotificationRepository,
    {
      provide: SupabaseClient,
      useValue: supabase,
    },
    {
      provide: EVENT_INVITATION_REPOSITORY,
      useClass: SupabaseEventInvitationRepository,
    },
    {
      provide: EVENT_REPOSITORY,
      useClass: SupabaseEventRepository,
    },
    {
      provide: REPRESENTATION_REQUEST_REPOSITORY,
      useClass: SupabaseRepresentationRequestRepository,
    },
    {
      provide: REPRESENTATION_CONTRACT_REPOSITORY,
      useClass: SupabaseRepresentationContractRepository,
    },
    {
      provide: MANAGER_REPOSITORY,
      useClass: DbManagerRepository,
    },
    {
      provide: ARTIST_REPOSITORY,
      useClass: DbArtistRepository,
    },
    ArtistGalleryRepository,
    ArtistVideoRepository,
  ],
  exports: [ArtistsService, ARTIST_REPOSITORY],
})
export class ArtistsModule {}
