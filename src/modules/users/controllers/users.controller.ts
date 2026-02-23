import { Body, Controller, Post, Req, UseGuards, BadRequestException, Get, UploadedFile, UploadedFiles, UseInterceptors, Inject, Patch, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { UsersService } from '../services/users.service';
import { OnboardingService } from '../services/onboarding.service';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { SUPABASE_CLIENT } from '@/src/infrastructure/database/supabase.module';
import type { SupabaseClient } from '@supabase/supabase-js';
import { memoryStorage } from 'multer';
import { UserContextGuard } from '../../auth/user-context.guard';

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
      email: (req.user as any)?.email ?? null,
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
      email: (req.user as any)?.email ?? null,
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

  @UseGuards(JwtAuthGuard, UserContextGuard)
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
    const email = (req.user as any)?.email ?? null;
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

    const currentRoleFromMetadata =
      typeof (req.user?.appMetadata as Record<string, unknown> | undefined)?.current_role === 'string'
        ? String((req.user.appMetadata as Record<string, unknown>).current_role).toUpperCase()
        : null;

    const inferredRole =
      req.userContext?.artistId ? 'ARTIST'
        : req.userContext?.venueId ? 'VENUE'
          : req.userContext?.promoterId ? 'PROMOTER'
            : req.userContext?.managerId ? 'MANAGER'
              : req.user?.isAdmin ? 'ADMIN'
                : currentRoleFromMetadata;
    const allowedRoles = new Set(['ARTIST', 'VENUE', 'PROMOTER', 'MANAGER', 'ADMIN']);
    const normalizedRole = inferredRole && allowedRoles.has(inferredRole) ? inferredRole : null;

    if (normalizedRole) {
      const inferredDisplayName = email ? String(email).split('@')[0] : 'Usuario';
      await this.usersService.ensureUserProfile({
        userId,
        email,
        role: normalizedRole,
        displayName: inferredDisplayName,
      });
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
    const url = await this.usersService.getSignedProfileImageUrlByUserId(userId);
    return { url };
  }

  @UseGuards(JwtAuthGuard)
  @Get('notification-preferences')
  async getNotificationPreferences(@Req() req: AuthenticatedRequest) {
    return this.usersService.getNotificationPreferencesByUserId(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('notification-preferences')
  async updateNotificationPreferences(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: Partial<{
      bookings: boolean;
      payments: boolean;
      messages: boolean;
      system: boolean;
      marketing: boolean;
      suggestions: boolean;
    }>,
  ) {
    return this.usersService.updateNotificationPreferencesByUserId(req.user.sub, body ?? {});
  }

  @UseGuards(JwtAuthGuard)
  @Get('verification')
  async getVerification(@Req() req: AuthenticatedRequest) {
    return this.usersService.getVerificationInfoByUserId(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verification/upload')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('INVALID_FILE_TYPE'), false);
        }
      },
    }),
  )
  async uploadVerificationDocuments(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles() files?: Array<any>,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('FILE_REQUIRED');
    }

    return this.usersService.uploadVerificationDocuments(req.user.sub, files);
  }

  @UseGuards(JwtAuthGuard)
  @Get('fiscal')
  async getFiscal(@Req() req: AuthenticatedRequest) {
    return this.usersService.getFiscalDataByUserId(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('fiscal')
  async updateFiscal(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: Partial<{
      fiscalName: string;
      taxId: string;
      fiscalAddress: string;
      fiscalCountry: string;
      iban: string;
    }>,
  ) {
    return this.usersService.updateFiscalDataByUserId(req.user.sub, body ?? {});
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(
    @Req() req: AuthenticatedRequest,
    @Body() body: { email?: string },
  ) {
    if (!body?.email) {
      throw new BadRequestException('EMAIL_REQUIRED');
    }
    return this.usersService.changeEmailByUserId(req.user.sub, body.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    if (!body?.newPassword) {
      throw new BadRequestException('NEW_PASSWORD_REQUIRED');
    }
    return this.usersService.changePasswordByUserId(req.user.sub, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/close-others')
  async closeOtherSessions(@Req() req: AuthenticatedRequest) {
    return this.usersService.closeOtherSessionsByUserId(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(@Req() req: AuthenticatedRequest) {
    return this.usersService.deleteAccountByUserId(req.user.sub);
  }
}
