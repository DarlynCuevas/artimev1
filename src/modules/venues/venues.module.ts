import { Module, forwardRef } from '@nestjs/common'
import { VenueDiscoverController } from './controllers/venue-discover.controller'
import { VenueDiscoverService } from './services/venue-discover.service'
import { ARTIST_REPOSITORY } from '../artists/repositories/artist-repository.token';
import { DbArtistRepository } from '../../infrastructure/database/repositories/artist/artist.repository';
import { BOOKING_REPOSITORY } from '../bookings/repositories/booking-repository.token';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/bookings/SupabaseBookingRepository '; 
import { ArtistsModule } from '../artists/artists.module';
import { BookingsModule } from '../bookings/bookings.module';
import { VENUE_REPOSITORY } from './repositories/venue-repository.token';
import { DbVenueRepository } from '../../infrastructure/database/repositories/venues/db-venue.repository';
import { VenueController } from './controllers/venue.controller';
import { DiscoverVenuesUseCase } from './use-cases/discover-venues.usecase';
import { VenuesService } from './services/venues.service';

@Module({
  imports: [forwardRef(() => ArtistsModule), forwardRef(() => BookingsModule)],
  controllers: [VenueDiscoverController,VenueController],
  providers: [
    VenueDiscoverService,
    DiscoverVenuesUseCase,
    VenuesService,
    {
      provide: ARTIST_REPOSITORY,
      useClass: DbArtistRepository,
    },
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
    {
      provide: VENUE_REPOSITORY,
      useClass: DbVenueRepository,
    },
  ],
})
export class VenuesModule {}
