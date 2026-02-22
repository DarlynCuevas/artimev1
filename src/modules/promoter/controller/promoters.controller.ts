import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserContextGuard } from '../../auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { PromoterService } from '../services/promoter.service';
import { Public } from '@/src/shared/public.decorator';

@Controller('promoters')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class PromotersController {
  constructor(private readonly promoterService: PromoterService) {}

  // Perfil privado (dashboard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    const { promoterId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('Not a promoter');
    }
    return this.promoterService.getProfile(promoterId);
  }

  // Editar perfil
  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name?: string;
      description?: string;
      city?: string;
      country?: string;
      eventTypes?: string[];
      isPublic?: boolean;
      showPastEvents?: boolean;
    },
  ) {
    const { promoterId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('Not a promoter');
    }
    await this.promoterService.updateProfile({
      promoterId,
      ...body,
    });
  }

  // Eventos del promotor
  @Get('me/events')
  async myEvents(@Req() req: AuthenticatedRequest) {
    const { promoterId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('Not a promoter');
    }
    return this.promoterService.getEvents(promoterId);
  }

  // Dashboard del promotor
  @Get('dashboard')
  async getPromoterDashboard(@Req() req: AuthenticatedRequest) {
    const { promoterId } = req.userContext;

    if (!promoterId) {
      throw new ForbiddenException('ONLY_PROMOTERS_ALLOWED');
    }

    return this.promoterService.getPromoterDashboard(promoterId);
  }

  // Perfil público
  @Public()
  @Get(':id')
  async publicProfile(@Param('id') id: string) {
    return this.promoterService.getProfile(id);
  }

  // Eventos organizados por promotor (perfil publico)
  @Public()
  @Get(':id/events')
  async publicEvents(@Param('id') id: string) {
    return this.promoterService.getEvents(id);
  }

  @Public()
  @Get(':id/gallery')
  async getPromoterGallery(@Param('id') id: string) {
    return this.promoterService.getPromoterGallery(id);
  }

  @Public()
  @Get(':id/videos')
  async getPromoterVideos(@Param('id') id: string) {
    return this.promoterService.getPromoterVideos(id);
  }

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
    const { promoterId, userId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('ONLY_PROMOTER');
    }
    if (!file) {
      throw new BadRequestException('FILE_REQUIRED');
    }

    return this.promoterService.addPromoterGalleryItem({
      promoterId,
      userId,
      file,
    });
  }

  @Delete('gallery/:id')
  async deleteGalleryImage(
    @Req() req: AuthenticatedRequest,
    @Param('id') itemId: string,
  ) {
    const { promoterId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('ONLY_PROMOTER');
    }

    return this.promoterService.removePromoterGalleryItem({
      promoterId,
      itemId,
    });
  }

  @Post('videos')
  async addPromoterVideo(
    @Req() req: AuthenticatedRequest,
    @Body() body: { url?: string; title?: string },
  ) {
    const { promoterId, userId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('ONLY_PROMOTER');
    }
    if (!body?.url) {
      throw new BadRequestException('URL_REQUIRED');
    }

    return this.promoterService.addPromoterVideo({
      promoterId,
      userId,
      url: body.url,
      title: body.title,
    });
  }

  @Delete('videos/:id')
  async deletePromoterVideo(
    @Req() req: AuthenticatedRequest,
    @Param('id') itemId: string,
  ) {
    const { promoterId } = req.userContext;
    if (!promoterId) {
      throw new ForbiddenException('ONLY_PROMOTER');
    }

    return this.promoterService.removePromoterVideo({
      promoterId,
      itemId,
    });
  }
}
