import { Module, forwardRef } from '@nestjs/common';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';
import { RepresentationController } from './controllers/representation.controller';
import { RepresentationService } from './services/representation.service';
import { ARTIST_REPOSITORY } from '@/src/modules/artists/repositories/artist-repository.token';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import { REPRESENTATION_CONTRACT_REPOSITORY, REPRESENTATION_REQUEST_REPOSITORY } from './repositories/representation-repository.tokens';
import { SupabaseRepresentationRequestRepository } from '@/src/infrastructure/database/repositories/representation/supabase-representation-request.repository';
import { SupabaseRepresentationContractRepository } from '@/src/infrastructure/database/repositories/representation/supabase-representation-contract.repository';
import { ArtistsModule } from '@/src/modules/artists/artists.module';
import { ManagersModule } from '@/src/modules/managers/managers.module';
import { OutboxModule } from '@/src/modules/outbox/outbox.module';
import { VenuesModule } from '@/src/modules/venues/venues.module';
import { PromotersModule } from '@/src/modules/promoter/promoter.module';
import { UserContextModule } from '@/src/modules/auth/user-context/user-context.module';
import { UserContextGuard } from '@/src/modules/auth/user-context.guard';

@Module({
  imports: [
    SupabaseModule,
    forwardRef(() => ArtistsModule),
    forwardRef(() => ManagersModule),
    forwardRef(() => VenuesModule),
    forwardRef(() => PromotersModule),
    forwardRef(() => UserContextModule),
    OutboxModule,
  ],
  controllers: [RepresentationController],
  providers: [
    RepresentationService,
    UserContextGuard,
    {
      provide: REPRESENTATION_REQUEST_REPOSITORY,
      useClass: SupabaseRepresentationRequestRepository,
    },
    {
      provide: REPRESENTATION_CONTRACT_REPOSITORY,
      useClass: SupabaseRepresentationContractRepository,
    },
  ],
  exports: [RepresentationService, REPRESENTATION_REQUEST_REPOSITORY, REPRESENTATION_CONTRACT_REPOSITORY],
})
export class RepresentationsModule {}
