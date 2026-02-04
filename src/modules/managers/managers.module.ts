import { Module, forwardRef } from '@nestjs/common';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { ArtistsModule } from '../artists/artists.module';
import { VenuesModule } from '../venues/venues.module';
import { PromotersModule } from '../promoter/promoter.module';

import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from './repositories/artist-manager-representation.repository.token';
import { ArtistManagerRepresentationService } from './services/artist-manager-representation.service';
import { DbArtistManagerRepresentationRepository } from '@/src/infrastructure/database/repositories/manager/artist-manager-representation.repository';
import { ManagerController } from './controllers/manager.controller';
import { ManagerService } from './services/manager.service';
import { MANAGER_REPOSITORY } from './repositories/manager-repository.token';
import { DbManagerRepository } from '@/src/infrastructure/database/repositories/manager/db-manager.repository';
import { UserContextModule } from '../auth/user-context/user-context.module';

@Module({
  imports: [
    SupabaseModule,
    forwardRef(() => UserContextModule),
    forwardRef(() => ArtistsModule),
    forwardRef(() => VenuesModule),
    forwardRef(() => PromotersModule),
  ],
  controllers: [ManagerController],
  providers: [
    {
      provide: ARTIST_MANAGER_REPRESENTATION_REPOSITORY,
      useClass: DbArtistManagerRepresentationRepository,
    },
    {
      provide: MANAGER_REPOSITORY,
      useClass: DbManagerRepository,
    },
    ArtistManagerRepresentationService,
    ManagerService,
  ],
  exports: [
    ArtistManagerRepresentationService,
    ARTIST_MANAGER_REPRESENTATION_REPOSITORY,
    ManagerService,
    MANAGER_REPOSITORY,
  ],
})
export class ManagersModule {}
