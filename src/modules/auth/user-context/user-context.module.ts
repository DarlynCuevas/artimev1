import { Module, forwardRef } from '@nestjs/common';

import { UserContextGuard } from './user-context.guard';

import { ArtistsModule } from '../../artists/artists.module';
import { VenuesModule } from '../../venues/venues.module';
import { PromotersModule } from '../../promoter/promoter.module';

@Module({
  imports: [
    forwardRef(() => ArtistsModule),
    forwardRef(() => VenuesModule),
    forwardRef(() => PromotersModule),
  ],
  providers: [UserContextGuard],
  exports: [UserContextGuard],
})
export class UserContextModule {}
