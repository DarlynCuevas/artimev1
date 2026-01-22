import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { VenueArtistCallRepository } from '@/src/infrastructure/database/repositories/venues/venue-artist-call.repository';

@Injectable()
export class GetInterestedArtistCallsUseCase {
  constructor(private readonly callRepo: VenueArtistCallRepository) {}

  async execute(userContext: AuthenticatedRequest['userContext']) {
    const { venueId } = userContext;
    if (!venueId) {
      throw new ForbiddenException('ONLY_VENUE');
    }

    return this.callRepo.findInterestedByVenue(venueId);
  }
}
