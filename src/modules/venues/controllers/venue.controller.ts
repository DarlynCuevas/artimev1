import { Controller, Get, Query, UseGuards, BadRequestException, Req, Param, ForbiddenException, Post, Body } from '@nestjs/common'
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard'
import { VenueDiscoverService } from '../services/venue-discover.service'
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request'
import { Public } from '@/src/shared/public.decorator';
import { VenuesService } from '../services/venues.service';
import { UserContextGuard } from '../../auth/user-context.guard';
import { CreateArtistCallUseCase } from '../use-cases/create-artist-call.usecase';
import { CreateArtistCallDto } from '../dto/create-artist-call.dto';


@Controller('venues')
export class VenueController {
    constructor(
        private readonly venuesService: VenuesService,
        private readonly createArtistCallUseCase: CreateArtistCallUseCase,
    ) { }
    
    @Public()
    @Get('discover')
    async discover(
        @Query('city') city?: string,
        @Query('genres') genres?: string,
    ) {
        return this.venuesService.discover({
            city,
            genres: genres ? genres.split(',') : undefined,
        });
    }
@UseGuards(JwtAuthGuard, UserContextGuard)
@Get('/dashboard')
async getVenueDashboard(
  @Req() req: AuthenticatedRequest,
) {
  const { venueId } = req.userContext;

  if (!venueId) {
    throw new ForbiddenException('ONLY_VENUE');
  }

  return this.venuesService.getVenueDashboard(venueId);
}


    @Get(':id')
    async getVenueById(@Param('id') id: string) {
        return this.venuesService.getPublicVenueProfile(id);
    }

        @UseGuards(JwtAuthGuard, UserContextGuard)
        @Post('artist-calls')
        async createArtistCall(
            @Req() req: AuthenticatedRequest,
            @Body() dto: CreateArtistCallDto,
        ) {
            return this.createArtistCallUseCase.execute(req.userContext, dto);
        }
}
