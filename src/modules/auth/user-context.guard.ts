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
import type { PromoterRepository } from '../promoter/repositories/promoter.repository.interface';
import { PROMOTER_REPOSITORY } from '../promoter/repositories/promoter-repository.token';
import type { ManagerRepository } from '../managers/repositories/manager.repository.interface';
import { MANAGER_REPOSITORY } from '../managers/repositories/manager-repository.token';

export type UserContext = {
  userId: string;
  artistId?: string;
  venueId?: string;
  managerId?: string;
  promoterId?: string;
  
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
    @Inject(MANAGER_REPOSITORY)
    private readonly managersRepository: ManagerRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Esto viene del JwtStrategy (Supabase -> sub)
    const userId: string | undefined = request.user?.sub;

    if (!userId) {
      return false;
    }

    // Resolver perfiles (una vez por request)
    const [artist, venue, promoter, manager] = await Promise.all([
      this.artistsRepository.findByUserId(userId),
      this.venuesRepository.findByUserId(userId),
       this.promotersRepository.findByUserId(userId),
      this.managersRepository.findByUserId(userId),
    ]);

    request.userContext = {
      userId,
      artistId: artist?.id,
      venueId: venue?.id,
      promoterId: promoter?.id,
      managerId: manager?.id,
    } satisfies UserContext;

    return true;
  }
}
