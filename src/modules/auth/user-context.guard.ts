import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ArtistRepository } from '../artists/repositories/artist.repository.interface';
import type { VenueRepository } from '../venues/repositories/venue.repository.interface';
import { Inject } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../artists/repositories/artist-repository.token';
import { VENUE_REPOSITORY } from '../venues/repositories/venue-repository.token';
import type { PromoterRepository } from '../promoter/repositories/promoter.repository.interface';
import { PROMOTER_REPOSITORY } from '../promoter/repositories/promoter-repository.token';

export type UserContext = {
  userId: string;
  artistId?: string | null;
  venueId?: string | null;
  managerId?: string | null;
  promoterId?: string | null;
  roles: {
    ARTIST: boolean;
    VENUE: boolean;
    MANAGER: boolean;
    PROMOTER: boolean;
  };
};

@Injectable()
export class UserContextGuard implements CanActivate {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistsRepository: ArtistRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venuesRepository: VenueRepository,
      @Inject(PROMOTER_REPOSITORY)
    private readonly promotersRepository: PromoterRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Esto viene del JwtStrategy (Supabase -> sub)
    const userId: string | undefined = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException();
    }

    // Resolver perfiles (una vez por request)
    const [artist, venue, promoter] = await Promise.all([
      this.artistsRepository.findByUserId(userId),
      this.venuesRepository.findByUserId(userId),
       this.promotersRepository.findByUserId(userId),
    ]);

    request.userContext = {
      userId,
      artistId: artist?.id ?? null,
      venueId: venue?.id ?? null,
      managerId: null,
      promoterId: promoter?.id ?? null,
      roles: {
        ARTIST: !!artist,
        VENUE: !!venue,
        MANAGER: false,
        PROMOTER: !!promoter,
      },
    } satisfies UserContext;

    return true;
  }
}
