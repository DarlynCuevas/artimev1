import { Module } from '@nestjs/common';
import { MeController } from './controllers/me.controller';
import { VenuesModule } from '../venues/venues.module';
import { ArtistsModule } from '../artists/artists.module';
import { MeService } from './services/me.service';


@Module({
  imports: [
    ArtistsModule,
    VenuesModule,
  ],
  controllers: [MeController],
  providers: [MeService],
})
export class UsersModule {}
