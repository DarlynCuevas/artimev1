import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import type { VenueRepository } from '../repositories/venue.repository.interface'
import { VENUE_REPOSITORY } from '../repositories/venue-repository.token'
import { mapVenueToPublicDto } from '../mappers/venue-public.mapper';
import { UsersService } from '../../users/services/users.service';
import { GetVenueDashboardUseCase } from '../use-cases/dashboard-venue.usecase';
import type { UpdateVenueDto } from '../dto/update-venue.dto';
import type { UserContext } from '../../auth/user-context.guard';
import { buildDayRange } from '../../artists/utils/build-day-range';

@Injectable()
export class VenuesService {
  constructor(
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
    private readonly getVenueDashboardUseCase: GetVenueDashboardUseCase,
    private readonly usersService: UsersService,
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

  async getMyVenueProfile(userId: string) {
    const venue = await this.venueRepository.findByUserId(userId);

    if (!venue) {
      throw new NotFoundException('VENUE_PROFILE_NOT_FOUND');
    }

    return venue;
  }

  async upsertMyVenueProfile(userContext: UserContext, dto: UpdateVenueDto) {
    const { userId, venueId } = userContext;

    if (venueId) {
      return this.venueRepository.updateProfile(venueId, dto);
    }

    return this.venueRepository.createForUser(userId, dto);
  }


  async getPublicVenueProfile(venueId: string) {
    const venue = await this.venueRepository.findById(venueId);

    if (!venue) {
      throw new NotFoundException('VENUE_NOT_FOUND');
    }

    const profileImageUrl = venue.userId
      ? await this.usersService.getSignedProfileImageUrlByUserId(venue.userId)
      : null;

    return { ...mapVenueToPublicDto(venue), profileImageUrl };
  }

  async getAvailability(
    venueId: string,
    from: string,
    to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException(
        'INVALID_DATE_RANGE: from and to are required',
      );
    }

    const bookedDates = await this.venueRepository.findBookedDates(
      venueId,
      from,
      to,
    );

    const days = buildDayRange(from, to).map((date) => ({
      date,
      status: bookedDates.includes(date) ? 'BOOKED' : 'AVAILABLE',
    }));

    return {
      venueId,
      from,
      to,
      days,
    };
  }
}
