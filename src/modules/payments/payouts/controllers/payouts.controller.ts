import {
  Controller,
  Get,
  Param,
  Req,
  NotFoundException,
  ForbiddenException,
  UseGuards,
  Post,
} from '@nestjs/common';
import type { Request } from 'express';
import { PayoutsQueryService } from '../queries/payouts-query.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CreatePayoutForBookingUseCase } from '../../use-cases/payouts/create-payout-for-booking.use-case';

interface AuthRequest extends Request {
  user: { id: string; role: string };
}

  @Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(
    private readonly payoutsQueryService: PayoutsQueryService,
    private readonly createPayoutForBookingUseCase: CreatePayoutForBookingUseCase,
  ) {}

  @Get()
  async getMyPayouts(@Req() req: AuthRequest) {
    const user = req.user;
    return this.payoutsQueryService.getPayoutsForUser(user);
  }

  @Get(':payoutId')
  async getPayoutById(
    @Req() req: AuthRequest,
    @Param('payoutId') payoutId: string,
  ) {
    const user = req.user;
    const payout = await this.payoutsQueryService.getPayoutByIdForUser(
      payoutId,
      user,
    );

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }
    return payout;
  }





 
   /**
    * Endpoint técnico de prueba (v1)
    * Crea el payout para un booking COMPLETED
    */
  /*  @Post(':bookingId')
   async create(@Param('bookingId') bookingId: string) {
     return this.createPayoutForBookingUseCase.execute({ bookingId });
   } */
 }
 
 
