import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetContractByBookingUseCase } from '../use-cases/get-contract-by-booking.use-case';
import { SignContractUseCase } from '../use-cases/sign-contract.use-case';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
    constructor(
        private readonly getContractByBookingUseCase: GetContractByBookingUseCase,
        private readonly signContractUseCase: SignContractUseCase,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get('by-booking/:bookingId')
    async getByBooking(
        @Param('bookingId') bookingId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.getContractByBookingUseCase.execute(bookingId);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':contractId/sign')
    async signContract(
        @Param('contractId') contractId: string,
        @Req() req: AuthenticatedRequest,
    ): Promise<void> {
        await this.signContractUseCase.execute({
            contractId: contractId,
            userId: req.user.sub,
        });
    }


}
