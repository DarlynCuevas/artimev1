import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { RequestBookingCancellationUseCase } from '../use-cases/request-booking-cancellation.usecase';
import { CancellationReason } from '../enums/cancellation-reason.enum';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '@/src/modules/auth/jwt-auth.guard';

@Controller('internal/cancellations')
export class CancellationsController {
  constructor(
    private readonly requestBookingCancellationUseCase: RequestBookingCancellationUseCase,
  ) {}
  @UseGuards(JwtAuthGuard)  
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
    const user = req.user;

   await this.requestBookingCancellationUseCase.execute({
  bookingId,
  userId: user.sub,
  userRole: user.role as 'ARTIST' | 'MANAGER' | 'VENUE' | 'PROMOTER',
  reason: body.reason,
  description: body.description,
});

    return { status: 'CANCELLED' };
  }
}
