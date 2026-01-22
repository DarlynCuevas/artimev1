import { Module, forwardRef } from '@nestjs/common';

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


@Module({
  imports: [SupabaseModule, forwardRef(() => VenuesModule), forwardRef(() => BookingsModule)],
  controllers: [ArtistsController, ArtistCalendarController],
  providers: [
    ArtistsService,
    DiscoverArtistsUseCase,
    GetArtistDashboardUseCase,
    CreateArtistCalendarBlockUseCase,
    GetArtistCalendarBlocksUseCase,
    DeleteArtistCalendarBlockUseCase,
    GetArtistBookingByDateUseCase,
    GetArtistBlocksByArtistIdUseCase,
    ArtistCalendarBlockRepository,
    {
      provide: ARTIST_REPOSITORY,
      useClass: DbArtistRepository,
    },
  ],
  exports: [ArtistsService, ARTIST_REPOSITORY],
})
export class ArtistsModule {}
