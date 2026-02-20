import { Body, Controller, Post, Req, UseGuards, BadRequestException, Get, UploadedFile, UseInterceptors, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { UsersService } from '../services/users.service';
import { OnboardingService } from '../services/onboarding.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';
import type { SupabaseClient } from '@supabase/supabase-js';
import { memoryStorage } from 'multer';

type RegisterPayload = {
  role: 'ARTIST' | 'VENUE' | 'PROMOTER' | 'MANAGER';
  displayName: string;
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly onboardingService: OnboardingService,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(
    @Req() req: AuthenticatedRequest,
    @Body() body: RegisterPayload,
  ) {
    if (!body?.role || !body?.displayName) {
      throw new BadRequestException('MISSING_FIELDS');
    }

    const userId = req.user.sub;
    const email = (req.user as any)?.email ?? null;

    return this.usersService.upsertUserProfile({
      userId,
      email,
      role: body.role,
      displayName: body.displayName,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/artist')
  async onboardingArtist(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name: string;
      city: string;
      genres: string[];
      basePrice: number;
      isNegotiable: boolean;
    },
  ) {
    return this.onboardingService.createArtistProfile({
      userId: req.user.sub,
      email: (req.user as any)?.email ?? null,
      name: body.name,
      city: body.city,
      genres: body.genres,
      basePrice: body.basePrice,
      isNegotiable: body.isNegotiable,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/venue')
  async onboardingVenue(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name: string;
      city: string;
      capacity?: number;
      address?: string;
    },
  ) {
    return this.onboardingService.createVenueProfile({
      userId: req.user.sub,
      name: body.name,
      city: body.city,
      capacity: body.capacity ?? null,
      address: body.address ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/promoter')
  async onboardingPromoter(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name: string;
      city: string;
    },
  ) {
    return this.onboardingService.createPromoterProfile({
      userId: req.user.sub,
      name: body.name,
      city: body.city,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/manager')
  async onboardingManager(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name: string;
      commissionAccepted: boolean;
    },
  ) {
    if (!body.commissionAccepted) {
      throw new BadRequestException('COMMISSION_NOT_ACCEPTED');
    }
    return this.onboardingService.createManagerProfile({
      userId: req.user.sub,
      email: (req.user as any)?.email ?? null,
      name: body.name,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile-image')
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
  async uploadProfileImage(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: any,
  ) {
    if (!file) {
      throw new BadRequestException('FILE_REQUIRED');
    }

    const userId = req.user.sub;
    const extension = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const storagePath = `users/${userId}/${fileName}`;

    const previousPath = await this.usersService.getProfileImagePath(userId);

    const { error: uploadError } = await this.supabase.storage
      .from('profile-images')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new BadRequestException(uploadError.message);
    }

    await this.usersService.updateProfileImage({
      userId,
      imagePath: storagePath,
    });

    if (previousPath && previousPath !== storagePath) {
      await this.supabase.storage.from('profile-images').remove([previousPath]);
    }

    return { ok: true, path: storagePath };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile-image')
  async getProfileImage(
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    const imagePath = await this.usersService.getProfileImagePath(userId);

    if (!imagePath) {
      return { url: null };
    }

    const { data, error } = await this.supabase.storage
      .from('profile-images')
      .createSignedUrl(imagePath, 60 * 60);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { url: data.signedUrl };
  }
}
