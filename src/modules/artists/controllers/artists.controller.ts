import { Controller, Get, Param, Query, Req, UseGuards, ForbiddenException, Patch, Body, Post, UploadedFile, UseInterceptors, BadRequestException, Delete } from '@nestjs/common';
import { ArtistsService } from '../services/artists.service';
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { UserContextGuard } from '../../auth/user-context.guard';
import { UpdateArtistDto } from '../dto/update-artist.dto';
import { GetArtistEventInvitationsQuery } from '../queries/get-artist-event-invitations.query';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Public } from '@/src/shared/public.decorator';
import { UsersService } from '../../users/services/users.service';
import type { ArtistBookingConditions } from '../types/artist-booking-conditions';


@Controller('artists')
export class ArtistsController {
  constructor(
    private readonly artistsService: ArtistsService,
    private readonly getArtistEventInvitationsQuery: GetArtistEventInvitationsQuery,
    private readonly usersService: UsersService,
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
    const profile = await this.artistsService.getPublicArtistProfile(artistId);

    // Fallback robusto: si artists.user_id no existe, usamos el auth user actual.
    if (!profile.profileImageUrl) {
      profile.profileImageUrl = await this.usersService.getSignedProfileImageUrlByUserId(req.user.sub);
    }
    if (!profile.isVerified) {
      profile.isVerified = await this.usersService.isUserVerified(req.user.sub);
    }

    return profile;
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

    return this.artistsService.updateArtistProfile(artistId, dto, {
      updatedByUserId: req.userContext.userId,
      updatedByRole: 'ARTIST',
    });
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Get(':id/booking-conditions')
  async getArtistBookingConditions(
    @Req() req: AuthenticatedRequest,
    @Param('id') artistId: string,
  ) {
    const bookingConditions = await this.artistsService.getBookingConditionsByArtistId(artistId);

    const canEditAsArtist = req.userContext.artistId === artistId;
    const canEditAsManager = req.userContext.managerId
      ? await this.artistsService.managerCanEditArtist(req.userContext.managerId, artistId)
      : false;

    return {
      artistId,
      bookingConditions,
      editableBy: canEditAsArtist ? 'ARTIST' : canEditAsManager ? 'MANAGER' : null,
    };
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Patch(':id/booking-conditions')
  async updateArtistBookingConditions(
    @Req() req: AuthenticatedRequest,
    @Param('id') artistId: string,
    @Body() body: { bookingConditions?: Partial<ArtistBookingConditions> | null },
  ) {
    const bookingConditions = body?.bookingConditions ?? null;

    if (req.userContext.artistId && req.userContext.artistId === artistId) {
      return this.artistsService.updateBookingConditionsAsArtist({
        artistId,
        userId: req.userContext.userId,
        bookingConditions,
      });
    }

    if (req.userContext.managerId) {
      return this.artistsService.updateBookingConditionsAsManager({
        artistId,
        managerId: req.userContext.managerId,
        userId: req.userContext.userId,
        bookingConditions,
      });
    }

    throw new ForbiddenException('ONLY_ARTIST_OR_ACTIVE_MANAGER');
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
  @UseGuards(JwtAuthGuard, UserContextGuard)
  async getArtistById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const viewerManagerId = req.userContext.managerId ?? null;
    return this.artistsService.getPublicArtistProfile(id, viewerManagerId);
  }

  @Public()
  @Get(':id/gallery')
  async getArtistGallery(@Param('id') id: string) {
    return this.artistsService.getArtistGallery(id);
  }

  @Public()
  @Get(':id/videos')
  async getArtistVideos(@Param('id') id: string) {
    return this.artistsService.getArtistVideos(id);
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Post('gallery')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('INVALID_FILE_TYPE'), false);
        }
      },
    }),
  )
  async uploadGalleryImage(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: any,
  ) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }
    if (!file) {
      throw new BadRequestException('FILE_REQUIRED');
    }

    return this.artistsService.addArtistGalleryItem({
      artistId,
      userId,
      file,
    });
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Delete('gallery/:id')
  async deleteGalleryImage(
    @Req() req: AuthenticatedRequest,
    @Param('id') itemId: string,
  ) {
    const { artistId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    return this.artistsService.removeArtistGalleryItem({
      artistId,
      itemId,
    });
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Post('videos')
  async addArtistVideo(
    @Req() req: AuthenticatedRequest,
    @Body() body: { url?: string; title?: string },
  ) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }
    if (!body?.url) {
      throw new BadRequestException('URL_REQUIRED');
    }

    return this.artistsService.addArtistVideo({
      artistId,
      userId,
      url: body.url,
      title: body.title ?? null,
    });
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Delete('videos/:id')
  async deleteArtistVideo(
    @Req() req: AuthenticatedRequest,
    @Param('id') itemId: string,
  ) {
    const { artistId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }

    return this.artistsService.removeArtistVideo({
      artistId,
      itemId,
    });
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
