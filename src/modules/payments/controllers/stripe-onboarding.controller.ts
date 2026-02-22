import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard';
import { StartStripeOnboardingUseCase } from '../use-cases/stripe/start-stripe-onboarding.use-case';
import { GetStripeOnboardingStatusUseCase } from '../use-cases/stripe/get-stripe-onboarding-status.use-case';

@Controller('payments/stripe')
export class StripeOnboardingController {
  constructor(
    private readonly startStripeOnboardingUseCase: StartStripeOnboardingUseCase,
    private readonly getStripeOnboardingStatusUseCase: GetStripeOnboardingStatusUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('artists/:artistId/onboarding')
  async startArtistOnboarding(
    @Req() req: AuthenticatedRequest,
    @Param('artistId') artistId: string,
  ): Promise<{ onboardingUrl: string }> {
    return this.startStripeOnboardingUseCase.execute({
      role: 'ARTIST',
      profileId: artistId,
      userId: req.user.sub,
      userEmail: req.user.email ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('venues/:venueId/onboarding')
  async startVenueOnboarding(
    @Req() req: AuthenticatedRequest,
    @Param('venueId') venueId: string,
  ): Promise<{ onboardingUrl: string }> {
    return this.startStripeOnboardingUseCase.execute({
      role: 'VENUE',
      profileId: venueId,
      userId: req.user.sub,
      userEmail: req.user.email ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('promoters/:promoterId/onboarding')
  async startPromoterOnboarding(
    @Req() req: AuthenticatedRequest,
    @Param('promoterId') promoterId: string,
  ): Promise<{ onboardingUrl: string }> {
    return this.startStripeOnboardingUseCase.execute({
      role: 'PROMOTER',
      profileId: promoterId,
      userId: req.user.sub,
      userEmail: req.user.email ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('managers/:managerId/onboarding')
  async startManagerOnboarding(
    @Req() req: AuthenticatedRequest,
    @Param('managerId') managerId: string,
  ): Promise<{ onboardingUrl: string }> {
    return this.startStripeOnboardingUseCase.execute({
      role: 'MANAGER',
      profileId: managerId,
      userId: req.user.sub,
      userEmail: req.user.email ?? null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('artists/:artistId/status')
  async getArtistStatus(
    @Req() req: AuthenticatedRequest,
    @Param('artistId') artistId: string,
  ) {
    return this.getStripeOnboardingStatusUseCase.execute({
      role: 'ARTIST',
      profileId: artistId,
      userId: req.user.sub,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('venues/:venueId/status')
  async getVenueStatus(
    @Req() req: AuthenticatedRequest,
    @Param('venueId') venueId: string,
  ) {
    return this.getStripeOnboardingStatusUseCase.execute({
      role: 'VENUE',
      profileId: venueId,
      userId: req.user.sub,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('promoters/:promoterId/status')
  async getPromoterStatus(
    @Req() req: AuthenticatedRequest,
    @Param('promoterId') promoterId: string,
  ) {
    return this.getStripeOnboardingStatusUseCase.execute({
      role: 'PROMOTER',
      profileId: promoterId,
      userId: req.user.sub,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('managers/:managerId/status')
  async getManagerStatus(
    @Req() req: AuthenticatedRequest,
    @Param('managerId') managerId: string,
  ) {
    return this.getStripeOnboardingStatusUseCase.execute({
      role: 'MANAGER',
      profileId: managerId,
      userId: req.user.sub,
    });
  }
}
