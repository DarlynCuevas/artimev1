import { Module } from '@nestjs/common';
import { ArtistsController } from './controllers/artists.controller';
import { ArtistsService } from './services/artists.service';


@Module({
  controllers: [ArtistsController],
  providers: [ArtistsService],
})
export class ArtistsModule {}
