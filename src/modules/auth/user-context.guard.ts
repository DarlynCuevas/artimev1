import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { ArtistRepository } from '../artists/repositories/artist.repository.interface';
import type { VenueRepository } from '../venues/repositories/venue.repository.interface';
import { Inject } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../artists/repositories/artist-repository.token';
import { VENUE_REPOSITORY } from '../venues/repositories/venue-repository.token';

export type UserContext = {
  userId: string;
  artistId?: string;
  venueId?: string;
  managerId?: string;
  
};

@Injectable()
export class UserContextGuard implements CanActivate {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistsRepository: ArtistRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venuesRepository: VenueRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Esto viene del JwtStrategy (Supabase -> sub)
    const userId: string | undefined = request.user?.sub;

    if (!userId) {
      return false;
    }

    // Resolver perfiles (una vez por request)
    const [artist, venue] = await Promise.all([
      this.artistsRepository.findByUserId(userId),
      this.venuesRepository.findByUserId(userId),
    ]);

    request.userContext = {
      userId,
      artistId: artist?.id,
      venueId: venue?.id,
    } satisfies UserContext;

    return true;
  }
}
