import { Body, Controller, Get, Param, Post, Req, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetContractByBookingUseCase } from '../use-cases/get-contract-by-booking.use-case';
import { SignContractUseCase } from '../use-cases/sign-contract.use-case';
import { UserContextGuard } from '../../auth/user-context.guard';
import { DocusignService } from '../services/docusign.service';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';
import { Inject } from '@nestjs/common';
import { ContractRepository } from '@/src/infrastructure/database/repositories/contract.repository';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
    constructor(
        private readonly getContractByBookingUseCase: GetContractByBookingUseCase,
        private readonly signContractUseCase: SignContractUseCase,
        private readonly docusignService: DocusignService,
        private readonly contractRepository: ContractRepository,
        @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: BookingRepository,
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
            artistId,
            managerId,
            userId: req.user.sub,
            conditionsAccepted: body.conditionsAccepted,
            conditionsVersion: body.conditionsVersion,
        });
    }


    @UseGuards(JwtAuthGuard, UserContextGuard)
    @Post(':contractId/docusign/signing-url')
    async createDocusignSigningUrl(
      @Param('contractId') contractId: string,
      @Req() req: AuthenticatedRequest,
      @Body() body: { returnUrl?: string },
    ): Promise<{ signingUrl: string; envelopeId: string; status: string }> {
      const resolvedContract = await this.contractRepository.findById(contractId);
      if (!resolvedContract) {
        throw new NotFoundException('Contract not found');
      }

      const booking = await this.bookingRepository.findById(resolvedContract.bookingId);
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const envelope = await this.docusignService.ensureEnvelope(resolvedContract, booking);
      const signer = this.docusignService.resolveSignerForUser({
        contract: resolvedContract,
        booking,
        userContext: req.userContext,
      });

      if (!signer) {
        throw new ForbiddenException('You are not allowed to sign this contract in DocuSign');
      }

      const defaultReturnUrl =
        process.env.DOCUSIGN_RETURN_URL ||
        process.env.STRIPE_CONNECT_RETURN_URL ||
        'https://artime-web.vercel.app/docusign/return';

      const signingUrl = await this.docusignService.createRecipientView({
        envelopeId: envelope.envelopeId,
        signer,
        returnUrl: body?.returnUrl || defaultReturnUrl,
      });

      return {
        signingUrl,
        envelopeId: envelope.envelopeId,
        status: envelope.status,
      };
    }

}
