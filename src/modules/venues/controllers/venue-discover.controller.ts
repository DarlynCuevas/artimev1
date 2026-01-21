import { Controller, Get, Query, UseGuards, BadRequestException, Req, Param } from '@nestjs/common'
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard'
import { VenueDiscoverService } from '../services/venue-discover.service'
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request'
import { Public } from '@/src/shared/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('venues-discover')
export class VenueDiscoverController {
  constructor(
    private readonly discoverService: VenueDiscoverService,
    private readonly venuesService: VenueDiscoverService,
  ) {}


@Public()
  @Get('artists')
  async discoverArtists(
    @Query('date') date: string,
    @Query('city') city?: string,
    @Query('genre') genre?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
    // @Req() req: AuthenticatedRequest,
  ) {
    if (!date) {
      throw new BadRequestException('DATE_REQUIRED')
    }

    return this.discoverService.findAvailableArtists({
      date,
      city,
      genre,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      search,
    })
  }
}
