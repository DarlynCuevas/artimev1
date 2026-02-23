import { Controller, Get, Query, UseGuards, BadRequestException, Req, Param, ForbiddenException, Post, Body, Put, Patch } from '@nestjs/common'
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard'
import { VenueDiscoverService } from '../services/venue-discover.service'
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request'
import { Public } from '@/src/shared/public.decorator';
import { VenuesService } from '../services/venues.service';
import { UpdateVenueDto } from '../dto/update-venue.dto';
import { UserContextGuard } from '../../auth/user-context.guard';
import { CreateArtistCallUseCase } from '../use-cases/create-artist-call.usecase';
import { CreateArtistCallDto } from '../dto/create-artist-call.dto';
import { GetInterestedArtistCallsUseCase } from '../use-cases/get-interested-artist-calls.usecase';
import { VenueSuggestionsService, type VenueSuggestionStatus } from '../services/venue-suggestions.service';
@Controller('venues')
export class VenueController {
    constructor(
        private readonly venuesService: VenuesService,
        private readonly createArtistCallUseCase: CreateArtistCallUseCase,
        private readonly getInterestedArtistCallsUseCase: GetInterestedArtistCallsUseCase,
        private readonly venueSuggestionsService: VenueSuggestionsService,
    ) { }

    @UseGuards(JwtAuthGuard, UserContextGuard)
    @Get('me')
    async getMyVenueProfile(@Req() req: AuthenticatedRequest) {
        const { userId } = req.userContext;
        return this.venuesService.getMyVenueProfile(userId);
    }

    @UseGuards(JwtAuthGuard, UserContextGuard)
    @Put('me')
    async updateMyVenueProfile(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateVenueDto,
    ) {
        return this.venuesService.upsertMyVenueProfile(req.userContext, dto);
    }

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

    @UseGuards(JwtAuthGuard, UserContextGuard)
    @Post('artist-calls')
    async createArtistCall(
        @Req() req: AuthenticatedRequest,
        @Body() dto: CreateArtistCallDto,
    ) {
        return this.createArtistCallUseCase.execute(req.userContext, dto);
    }

    @UseGuards(JwtAuthGuard, UserContextGuard)
    @Get('artist-calls/interested')
    async getInterestedCalls(
        @Req() req: AuthenticatedRequest,
    ) {
        return this.getInterestedArtistCallsUseCase.execute(req.userContext);
    }

    @UseGuards(JwtAuthGuard, UserContextGuard)
    @Get('suggestions')
    async getSuggestions(
      @Req() req: AuthenticatedRequest,
      @Query('status') status?: VenueSuggestionStatus | 'ALL',
    ) {
      return this.venueSuggestionsService.listForVenue(req.userContext, status);
    }

    @UseGuards(JwtAuthGuard, UserContextGuard)
    @Patch('suggestions/:id')
    async updateSuggestionStatus(
      @Req() req: AuthenticatedRequest,
      @Param('id') id: string,
      @Body() body: { status: 'VIEWED' | 'SAVED' | 'ACCEPTED' | 'DECLINED' },
    ) {
      if (!body?.status) {
        throw new BadRequestException('MISSING_STATUS');
      }
      return this.venueSuggestionsService.updateStatusForVenue(req.userContext, id, {
        status: body.status,
      });
    }

    @Public()
    @Get(':id')
    async getVenueById(@Param('id') id: string) {
        return this.venuesService.getPublicVenueProfile(id);
    }

    @Public()
    @Get(':id/availability')
    async getAvailability(
        @Param('id') venueId: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.venuesService.getAvailability(venueId, from, to);
    }
}
