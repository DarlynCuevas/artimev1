import { Module, forwardRef } from '@nestjs/common';
import { ArtistsModule } from '../artists/artists.module';
import { VenuesModule } from '../venues/venues.module';
import { MeService } from './services/me.service';
import { PromotersModule } from '../promoter/promoter.module';

@Module({
  imports: [
    forwardRef(() => ArtistsModule),
    forwardRef(() => VenuesModule),
    forwardRef(() => PromotersModule), // 🔴 CLAVE
  ],
  providers: [
    MeService,
  ],
  exports: [
    MeService,
  ],
})
export class UsersModule {}
