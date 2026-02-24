import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetContractByBookingUseCase } from '../use-cases/get-contract-by-booking.use-case';
import { SignContractUseCase } from '../use-cases/sign-contract.use-case';
import { UserContextGuard } from '../../auth/user-context.guard';
import { DocusignService } from '@/src/modules/contracts/services/docusign.service';
import { ContractRepository } from '@/src/infrastructure/database/repositories/contract.repository';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly getContractByBookingUseCase: GetContractByBookingUseCase,
    private readonly signContractUseCase: SignContractUseCase,
    private readonly docusignService: DocusignService,
    private readonly contractRepository: ContractRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: BookingRepository,
  ) {}

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
      contractId,
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
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const booking = await this.bookingRepository.findById(contract.bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    try {
      const envelope = await this.docusignService.ensureEnvelope(contract, booking);
      const signer = this.docusignService.resolveSignerForUser({
        contract,
        booking,
        userContext: req.userContext,
      });

      if (!signer) {
        const docusignRecipients =
          (contract.snapshotData?.docusign?.recipients as Array<{
            role?: string;
            recipientId?: string;
            clientUserId?: string;
            email?: string;
            name?: string;
          }> | undefined) ?? [];

        throw new ForbiddenException({
          message: 'You are not allowed to sign this contract in DocuSign',
          debug: {
            userContext: req.userContext,
            requestUser: {
              sub: req.user?.sub,
              email: req.user?.email,
            },
            booking: {
              id: booking.id,
              artistId: booking.artistId,
              managerId: booking.managerId,
              venueId: booking.venueId,
              promoterId: booking.promoterId,
            },
            recipients: docusignRecipients.map((recipient) => ({
              role: recipient.role ?? null,
              recipientId: recipient.recipientId ?? null,
              clientUserId: recipient.clientUserId ?? null,
              email: recipient.email ?? null,
              name: recipient.name ?? null,
            })),
          },
        });
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'DOCUSIGN_ERROR';
      throw new BadRequestException(`DOCUSIGN_ERROR: ${msg}`);
    }
  }
}
