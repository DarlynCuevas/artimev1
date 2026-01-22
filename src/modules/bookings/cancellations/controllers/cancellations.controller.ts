import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { RequestBookingCancellationUseCase } from '../use-cases/request-booking-cancellation.usecase';
import { CancellationReason } from '../enums/cancellation-reason.enum';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard';
import { UserContextGuard } from '@/src/modules/auth/user-context.guard';

@Controller('internal/bookings-cancellations')
export class CancellationsController {
  constructor(
    private readonly requestBookingCancellationUseCase: RequestBookingCancellationUseCase,
  ) {}
@UseGuards(JwtAuthGuard, UserContextGuard)
@Post(':bookingId')
async cancel(
  @Param('bookingId') bookingId: string,
  @Req() req: AuthenticatedRequest,
  @Body()
  body: {
    reason: CancellationReason;
    description?: string;
  },
) {
  const { userId, venueId, artistId, managerId } = req.userContext;

  let userRole: 'ARTIST' | 'MANAGER' | 'VENUE' | 'PROMOTER';

  if (artistId) {
    userRole = 'ARTIST';
  } else if (managerId) {
    userRole = 'MANAGER';
  } else if (venueId) {
    userRole = 'VENUE';
  } else {
    throw new ForbiddenException();
  }

  await this.requestBookingCancellationUseCase.execute({
    bookingId,
    userId,
    userRole,
    reason: body.reason,
    description: body.description,
  });

  return { status: 'CANCELLED' };
}
}