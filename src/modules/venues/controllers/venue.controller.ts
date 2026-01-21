import { Controller, Get, Query, UseGuards, BadRequestException, Req, Param } from '@nestjs/common'
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard'
import { VenueDiscoverService } from '../services/venue-discover.service'
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request'
import { Public } from '@/src/shared/public.decorator';
import { VenuesService } from '../services/venues.service';


@Controller('venues')
export class VenueController {
    constructor(
        private readonly venuesService: VenuesService,
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
    @Get(':id')
    async getVenueById(@Param('id') id: string) {
        return this.venuesService.getPublicVenueProfile(id);
    }



}
