import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { VenueArtistCallRepository } from '@/src/infrastructure/database/repositories/venues/venue-artist-call.repository';
import { ARTIST_REPOSITORY } from '../../artists/repositories/artist-repository.token';
import type { ArtistRepository } from '../../artists/repositories/artist.repository.interface';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { CreateArtistCallDto } from '../dto/create-artist-call.dto';
import { OutboxRepository } from '../../../infrastructure/database/repositories/outbox/outbox.repository';
import { VENUE_REPOSITORY } from '../repositories/venue-repository.token';
import type { VenueRepository } from '../repositories/venue.repository.interface';

@Injectable()
export class CreateArtistCallUseCase {
  constructor(
    private readonly callRepo: VenueArtistCallRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepo: ArtistRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepo: VenueRepository,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(userContext: AuthenticatedRequest['userContext'], dto: CreateArtistCallDto) {
    const { venueId } = userContext;
    if (!venueId) {
      throw new ForbiddenException('ONLY_VENUE');
    }

    const venue = await this.venueRepo.findById(venueId);
    const cityFilter = dto.city?.trim() || undefined;
    const cityToStore = cityFilter ?? venue?.city ?? null;

    const eligibleArtists = await this.artistRepo.findAvailableForDate({
      date: dto.date,
      city: cityFilter,
      genre: dto.filters?.genre,
      minPrice: dto.filters?.minPrice,
      maxPrice: dto.filters?.maxPrice,
      search: dto.filters?.search,
    });

    const call = await this.callRepo.createCall({
      venueId,
      date: dto.date,
      city: cityToStore,
      filters: dto.filters ?? undefined,
    });

    await this.outboxRepo.enqueue({
      type: 'ARTIST_CALL_CREATED',
      payload: {
        callId: call.id,
        venueId,
        venueName: venue?.name,
        date: dto.date,
        city: cityFilter,
        filters: dto.filters ?? {},
        eligibleArtistIds: eligibleArtists.map((a) => a.artistId),
      },
    });

    return {
      callId: call.id,
      notifiedArtists: eligibleArtists.length,
      eligibleArtistIds: eligibleArtists.map((a) => a.artistId),
    };
  }
}
