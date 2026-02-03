import { Module, forwardRef } from '@nestjs/common';
import { ArtistsModule } from '../artists/artists.module';
import { VenuesModule } from '../venues/venues.module';
import { SupabaseModule } from '../../infrastructure/database/supabase.module';
import { MeService } from './services/me.service';
import { PromotersModule } from '../promoter/promoter.module';
import { MeController } from './controllers/me.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';

@Module({
  imports: [
    SupabaseModule,
    forwardRef(() => ArtistsModule),
    forwardRef(() => VenuesModule),
    forwardRef(() => PromotersModule), // CLAVE
  ],
  controllers: [MeController, NotificationsController],
  providers: [
    MeService,
    ArtistNotificationRepository,
  ],
  exports: [
    MeService,
  ],
})
export class UsersModule {}
