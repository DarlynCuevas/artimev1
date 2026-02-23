import { Module, forwardRef } from '@nestjs/common'
import { PromotersModule } from '../promoter/promoter.module';
import { VenueDiscoverController } from './controllers/venue-discover.controller'
import { VenueDiscoverService } from './services/venue-discover.service'
import { ARTIST_REPOSITORY } from '../artists/repositories/artist-repository.token';
import { DbArtistRepository } from '../../infrastructure/database/repositories/artist/artist.repository';
import { BOOKING_REPOSITORY } from '../bookings/repositories/booking-repository.token';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/bookings/SupabaseBookingRepository'; 
import { PAYMENT_MILESTONE_REPOSITORY } from '../payments/payment-milestone-repository.token';
import { DbPaymentMilestoneRepository } from '../../infrastructure/database/repositories/db-payment-milestone.repository';
import { ArtistsModule } from '../artists/artists.module';
import { BookingsModule } from '../bookings/bookings.module';
import { VENUE_REPOSITORY } from './repositories/venue-repository.token';
import { DbVenueRepository } from '../../infrastructure/database/repositories/venues/db-venue.repository';
import { VenueController } from './controllers/venue.controller';
import { DiscoverVenuesUseCase } from './use-cases/discover-venues.usecase';
import { VenuesService } from './services/venues.service';
import { GetVenueDashboardUseCase } from './use-cases/dashboard-venue.usecase';
import { VenueArtistCallRepository } from '@/src/infrastructure/database/repositories/venues/venue-artist-call.repository';
import { CreateArtistCallUseCase } from './use-cases/create-artist-call.usecase';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { OutboxModule } from '../outbox/outbox.module';
import { GetInterestedArtistCallsUseCase } from './use-cases/get-interested-artist-calls.usecase';
import { ManagersModule } from '../managers/managers.module';
import { UserContextModule } from '../auth/user-context/user-context.module';
import { UsersModule } from '../users/users.module';
import { VenueSuggestionsService } from './services/venue-suggestions.service';

@Module({
  imports: [SupabaseModule, OutboxModule, forwardRef(() => ArtistsModule), forwardRef(() => BookingsModule), forwardRef(() => PromotersModule), forwardRef(() => ManagersModule), forwardRef(() => UserContextModule), forwardRef(() => UsersModule)],
  controllers: [VenueDiscoverController,VenueController],
  providers: [
    VenueDiscoverService,
    DiscoverVenuesUseCase,
    VenuesService,
    GetVenueDashboardUseCase,
    CreateArtistCallUseCase,
    GetInterestedArtistCallsUseCase,
    VenueSuggestionsService,
    VenueArtistCallRepository,
    {
      provide: ARTIST_REPOSITORY,
      useClass: DbArtistRepository,
    },
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
    {
      provide: PAYMENT_MILESTONE_REPOSITORY,
      useClass: DbPaymentMilestoneRepository,
    },
    {
      provide: VENUE_REPOSITORY,
      useClass: DbVenueRepository,
    },
  ],
  exports: [VenuesService, VENUE_REPOSITORY, VenueSuggestionsService],
})
export class VenuesModule {}
