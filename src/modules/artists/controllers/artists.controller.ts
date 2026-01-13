import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArtistsService } from '../services/artists.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/shared/authenticated-request';


@Controller('artists')

export class ArtistsController {
  constructor(
    private readonly artistsService: ArtistsService,
  ) {}
@UseGuards(JwtAuthGuard)
  @Get()
  async getArtists(@Req() req: AuthenticatedRequest ) {
    return this.artistsService.findAll();
  }
}
