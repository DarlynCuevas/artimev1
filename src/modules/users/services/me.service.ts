import { Injectable } from '@nestjs/common';

import { ArtistsService } from '@/src/modules/artists/services/artists.service';
import { VenuesService } from '@/src/modules/venues/services/venues.service';

@Injectable()
export class MeService {
  constructor(
    private readonly artistsService: ArtistsService,
    private readonly venuesService: VenuesService,
  ) {}

  async resolveMe(userId: string) {
    try {
      const [artist, venue] = await Promise.all([
        this.artistsService.findByUserId(userId),
        this.venuesService.findByUserId(userId),
      ]);

      return {
        userId,
        profiles: {
          artist: artist
            ? { id: artist.id, name: artist.name }
            : null,
          venue: venue
            ? { id: venue.id, name: venue.name }
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
