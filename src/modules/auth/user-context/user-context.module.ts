import { Module, forwardRef } from '@nestjs/common';

import { UserContextGuard } from './user-context.guard';

import { ArtistsModule } from '../../artists/artists.module';
import { VenuesModule } from '../../venues/venues.module';
import { PromotersModule } from '../../promoter/promoter.module';
import { ManagersModule } from '../../managers/managers.module';

@Module({
  imports: [
    forwardRef(() => ArtistsModule),
    forwardRef(() => VenuesModule),
    forwardRef(() => PromotersModule),
    forwardRef(() => ManagersModule),
  ],
  providers: [UserContextGuard],
  exports: [UserContextGuard],
})
export class UserContextModule {}
