import { Module, forwardRef } from '@nestjs/common';

import { SupabaseModule } from '../../infrastructure/database/supabase.module';

import { PROMOTER_REPOSITORY } from './repositories/promoter-repository.token';

import { PromotersController } from './controller/promoters.controller';
import { PromoterService } from './services/promoter.service';

import { GetPromoterProfileQuery } from './queries/get-promoter-profile.query';
import { UpdatePromoterProfileUseCase } from './use-cases/update-promoter-profile.usecase';
import { GetPromoterDashboardUseCase } from './use-cases/dashboard-promoter.usecase';

import { EventsModule } from '../events/events.module';
import { ArtistsModule } from '../artists/artists.module';
import { VenuesModule } from '../venues/venues.module';
import { BookingsModule } from '../bookings/bookings.module';
import { DbPromoterRepository } from '@/src/infrastructure/database/repositories/promoter/DbPromoterRepository ';
import { ManagersModule } from '../managers/managers.module';
import { UserContextModule } from '../auth/user-context/user-context.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    SupabaseModule,

    forwardRef(() => EventsModule),
    forwardRef(() => ArtistsModule),
    forwardRef(() => VenuesModule),
    forwardRef(() => BookingsModule),
    forwardRef(() => ManagersModule),
    forwardRef(() => UserContextModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [PromotersController],
  providers: [
    PromoterService,
    GetPromoterProfileQuery,
    UpdatePromoterProfileUseCase,
    GetPromoterDashboardUseCase,
    {
      provide: PROMOTER_REPOSITORY,
      useClass: DbPromoterRepository,
    },
  ],
  exports: [
    PROMOTER_REPOSITORY,
    PromoterService,
    GetPromoterDashboardUseCase,
  ],
})
export class PromotersModule {}
