import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ARTIST_REPOSITORY } from '../../artists/repositories/artist-repository.token';
import { VENUE_REPOSITORY } from '../../venues/repositories/venue-repository.token';
import type{ ArtistRepository } from '../../artists/repositories/artist.repository.interface';
import type{ VenueRepository } from '../../venues/repositories/venue.repository.interface';
import type { PromoterRepository } from '../../promoter/repositories/promoter.repository.interface';
import { PROMOTER_REPOSITORY } from '../../promoter/repositories/promoter-repository.token';


@Injectable()
export class UserContextGuard implements CanActivate {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,

    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,

    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException();
    }

    const userId = user.sub;

    const [artist, venue, promoter] = await Promise.all([
      this.artistRepository.findByUserId(userId),
      this.venueRepository.findByUserId(userId),
      this.promoterRepository.findByUserId(userId),
    ]);

    request.userContext = {
      userId,
      artistId: artist?.id ?? null,
      venueId: venue?.id ?? null,
      promoterId: promoter?.id ?? null,
      roles: {
        ARTIST: !!artist,
        VENUE: !!venue,
        PROMOTER: !!promoter,
      },
    };

    return true;
  }
}