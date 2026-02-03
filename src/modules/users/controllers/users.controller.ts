import { Body, Controller, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { UsersService } from '../services/users.service';
import { OnboardingService } from '../services/onboarding.service';

type RegisterPayload = {
  role: 'ARTIST' | 'VENUE' | 'PROMOTER' | 'MANAGER';
  displayName: string;
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly onboardingService: OnboardingService,
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
}
