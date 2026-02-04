import { Injectable } from '@nestjs/common';

import { ArtistsService } from '@/src/modules/artists/services/artists.service';
import { VenuesService } from '@/src/modules/venues/services/venues.service';
import { PromoterService } from '../../promoter/services/promoter.service';
import { ManagerService } from '../../managers/services/manager.service';

@Injectable()
export class MeService {
  constructor(
    private readonly artistsService: ArtistsService,
    private readonly venuesService: VenuesService,
    private readonly promoterService: PromoterService,
    private readonly managerService: ManagerService,
  ) {}

  async resolveMe(userId: string) {
    try {
      const [artist, venue, promoterEntity, manager] = await Promise.all([
        this.artistsService.findByUserId(userId),
        this.venuesService.findByUserId(userId),
        this.promoterService.findByUserId(userId),
        this.managerService.findByUserId(userId),
      ]);


      let promoter: any = null;
      if (promoterEntity) {
        promoter = await this.promoterService.getProfile(promoterEntity.id);
      }

      return {
        userId,
        profiles: {
          artist: artist
            ? { id: artist.id, name: artist.name }
            : null,
          venue: venue
            ? { id: venue.id, name: venue.name }
            : null,
          promoter: promoter
            ? { id: promoter.id, name: promoter.name }
            : null,
          manager: manager
            ? { id: manager.id, name: manager.name }
            : null,
        },
      };
    } catch (error) {
      return {
        userId,
        error: error?.message || 'Error interno en MeService',
      };
    }
  }
}
