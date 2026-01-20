import { Module, forwardRef } from '@nestjs/common'
import { VenueDiscoverController } from './controllers/venue-discover.controller'
import { VenueDiscoverService } from './services/venue-discover.service'
import { ARTIST_REPOSITORY } from '../artists/repositories/artist-repository.token';
import { DbArtistRepository } from '../../infrastructure/database/repositories/artist/artist.repository';
import { BOOKING_REPOSITORY } from '../bookings/repositories/booking-repository.token';
import { SupabaseBookingRepository } from '../../infrastructure/database/repositories/bookings/SupabaseBookingRepository '; 
import { ArtistsModule } from '../artists/artists.module';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [forwardRef(() => ArtistsModule), forwardRef(() => BookingsModule)],
  controllers: [VenueDiscoverController],
  providers: [
    VenueDiscoverService,
    {
      provide: ARTIST_REPOSITORY,
      useClass: DbArtistRepository,
    },
    {
      provide: BOOKING_REPOSITORY,
      useClass: SupabaseBookingRepository,
    },
  ],
})
export class VenuesModule {}
