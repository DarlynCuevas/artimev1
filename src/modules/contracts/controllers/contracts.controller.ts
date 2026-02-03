import { Body, Controller, Get, Param, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetContractByBookingUseCase } from '../use-cases/get-contract-by-booking.use-case';
import { SignContractUseCase } from '../use-cases/sign-contract.use-case';
import { UserContextGuard } from '../../auth/user-context.guard';

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

    @UseGuards(JwtAuthGuard, UserContextGuard)
    @Post(':contractId/sign')
    async signContract(
        @Param('contractId') contractId: string,
        @Req() req: AuthenticatedRequest,
        @Body() body: { conditionsAccepted: boolean; conditionsVersion?: string },
    ): Promise<void> {
        const { artistId, managerId } = req.userContext;
        if (!artistId && !managerId) {
            throw new ForbiddenException('ONLY_ARTIST_OR_MANAGER');
        }

        await this.signContractUseCase.execute({
            contractId: contractId,
            artistId: artistId ?? undefined,
            managerId: managerId ?? undefined,
            userId: req.user.sub,
            conditionsAccepted: body.conditionsAccepted,
            conditionsVersion: body.conditionsVersion,
        });
    }


}
