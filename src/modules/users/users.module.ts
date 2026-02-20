import { Module, forwardRef } from '@nestjs/common';
import { ArtistsModule } from '../artists/artists.module';
import { VenuesModule } from '../venues/venues.module';
import { SupabaseModule } from '../../infrastructure/database/supabase.module';
import { MeService } from './services/me.service';
import { PromotersModule } from '../promoter/promoter.module';
import { MeController } from './controllers/me.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { UsersController } from './controllers/users.controller';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { UsersService } from './services/users.service';
import { OnboardingService } from './services/onboarding.service';
import { ManagersModule } from '../managers/managers.module';

@Module({
  imports: [
    SupabaseModule,
    forwardRef(() => ArtistsModule),
    forwardRef(() => VenuesModule),
    forwardRef(() => PromotersModule), // CLAVE
    forwardRef(() => ManagersModule),
  ],
  controllers: [MeController, NotificationsController, UsersController],
  providers: [
    MeService,
    ArtistNotificationRepository,
    UsersService,
    OnboardingService,
  ],
  exports: [
    MeService,
    UsersService,
  ],
})
export class UsersModule {}
