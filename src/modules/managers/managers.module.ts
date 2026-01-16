import { Module } from '@nestjs/common';
import { SupabaseModule } from '@/src/infrastructure/database/supabase.module';

import { ARTIST_MANAGER_REPRESENTATION_REPOSITORY } from './repositories/artist-manager-representation.repository.token';
import { ArtistManagerRepresentationRepository } from './repositories/artist-manager-representation.repository.interface';

import { ArtistManagerRepresentationService } from './services/artist-manager-representation.service';
import { DbArtistManagerRepresentationRepository } from '@/src/infrastructure/database/repositories/manager/artist-manager-representation.repository';

// implementación concreta (infraestructura)

@Module({
  imports: [SupabaseModule],
  providers: [
    // 🔗 Binding interface → implementación
    {
      provide: ARTIST_MANAGER_REPRESENTATION_REPOSITORY,
      useClass: DbArtistManagerRepresentationRepository,
    },

    // 🧠 Dominio
    ArtistManagerRepresentationService,
  ],
  exports: [
    // Exportamos el service para que otros módulos (bookings) lo usen
    ArtistManagerRepresentationService,

    // Exportamos el repositorio para que esté disponible en BookingsModule
    ARTIST_MANAGER_REPRESENTATION_REPOSITORY,
  ],
})
export class ManagersModule {}
