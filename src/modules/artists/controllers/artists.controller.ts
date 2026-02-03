import { Controller, Get, Param, Query, Req, UseGuards, ForbiddenException, Patch, Body } from '@nestjs/common';
import { ArtistsService } from '../services/artists.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/shared/authenticated-request';
import { Public } from '@/src/shared/public.decorator';
import { UserContextGuard } from '../../auth/user-context.guard';
import { UpdateArtistDto } from '../dto/update-artist.dto';
import { GetArtistEventInvitationsQuery } from '../queries/get-artist-event-invitations.query';


@Controller('artists')
export class ArtistsController {
  constructor(
    private readonly artistsService: ArtistsService,
    private readonly getArtistEventInvitationsQuery: GetArtistEventInvitationsQuery,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('discover')
  async discoverArtists(@Req() req: AuthenticatedRequest) {

    return this.artistsService.discover();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getArtists(@Req() req: AuthenticatedRequest) {
    return this.artistsService.findAll();
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Get('me')
  async getMyArtistProfile(@Req() req: AuthenticatedRequest) {
    const { artistId } = req.userContext;

    if (!artistId) {
      throw new ForbiddenException('USER_IS_NOT_ARTIST');
    }

    return this.artistsService.getPublicArtistProfile(artistId);
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Patch('me')
  async updateMyArtistProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateArtistDto,
  ) {
    const { artistId } = req.userContext;

    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    return this.artistsService.updateArtistProfile(artistId, dto);
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Get('dashboard')
  async getArtistDashboard(@Req() req: AuthenticatedRequest) {
    const { artistId } = req.userContext;

    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    return this.artistsService.getArtistDashboard(artistId);
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Get('me/event-invitations')
  async getMyEventInvitations(@Req() req: AuthenticatedRequest) {
    const { artistId } = req.userContext;

    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    return this.getArtistEventInvitationsQuery.execute(artistId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getArtistById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.artistsService.getPublicArtistProfile(id)
  }


@Get(':id/availability')
async getAvailability(
  @Param('id') artistId: string,
  @Query('from') from: string,
  @Query('to') to: string,
  @Req() req: AuthenticatedRequest
) {
  return this.artistsService.getAvailability(artistId, from, to);
}


}
