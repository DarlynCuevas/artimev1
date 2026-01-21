import { Module } from '@nestjs/common';

import { ArtistsController } from './controllers/artists.controller';
import { ArtistsService } from './services/artists.service';
import { ARTIST_REPOSITORY } from './repositories/artist-repository.token';
import { DbArtistRepository } from '../../infrastructure/database/repositories/artist/artist.repository';
import { DiscoverArtistsUseCase } from './use-cases/discover-artists.usecase';


@Module({
  controllers: [ArtistsController],
  providers: [
    ArtistsService,
    DiscoverArtistsUseCase,
    {
      provide: ARTIST_REPOSITORY,
      useClass: DbArtistRepository,
    },
  ],
  exports: [ArtistsService],
})
export class ArtistsModule {}
