import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArtistsService } from '../services/artists.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/shared/authenticated-request';
import { Public } from '@/src/shared/public.decorator';


@Controller('artists')
export class ArtistsController {
  constructor(
    private readonly artistsService: ArtistsService,
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
