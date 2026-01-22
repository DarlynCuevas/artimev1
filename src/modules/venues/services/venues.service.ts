import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { VenueRepository } from '../repositories/venue.repository.interface'
import { VENUE_REPOSITORY } from '../repositories/venue-repository.token'
import { mapVenueToPublicDto } from '../mappers/venue-public.mapper';
import { GetVenueDashboardUseCase } from '../use-cases/dashboard-venue.usecase';

@Injectable()
export class VenuesService {
  constructor(
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
    private readonly getVenueDashboardUseCase: GetVenueDashboardUseCase,
  ) { }
  async getVenueDashboard(venueId: string) {
    return this.getVenueDashboardUseCase.execute(venueId);
  }

  async discover(filters?: {
    city?: string;
    genres?: string[];
  }) {
    const venues = await this.venueRepository.findForDiscover(filters);
    return venues.map(mapVenueToPublicDto);
  }

  async findByUserId(userId: string) {
    return this.venueRepository.findByUserId(userId);
  }


  async getPublicVenueProfile(venueId: string) {
    const venue = await this.venueRepository.findById(venueId);

    if (!venue) {
      throw new NotFoundException('VENUE_NOT_FOUND');
    }

    return mapVenueToPublicDto(venue);
  }

}

