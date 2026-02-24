import {
  ForbiddenException,
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ContractRepository } from '../../../infrastructure/database/repositories/contract.repository';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';
import { ContractStatus } from '../enum/contractStatus.enum';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { CreatePaymentScheduleForBookingUseCase } from '../../payments/use-cases/create-payment-schedule-for-booking.usecase';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { VENUE_REPOSITORY } from '@/src/modules/venues/repositories/venue-repository.token';
import type { VenueRepository } from '@/src/modules/venues/repositories/venue.repository.interface';
import { PROMOTER_REPOSITORY } from '@/src/modules/promoter/repositories/promoter-repository.token';
import type { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { notifyBookingCounterpart } from '../../bookings/notifications/booking-notifications';
import { NegotiationSenderRole } from '../../bookings/negotiations/negotiation-message.entity';

@Injectable()
export class SignContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly createPaymentScheduleForBookingUseCase: CreatePaymentScheduleForBookingUseCase,
    private readonly notificationsRepo: ArtistNotificationRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
  ) {}

  async execute(input: {
    contractId: string;
    artistId?: string;
    managerId?: string;
    userId: string;
    conditionsAccepted: boolean;
    conditionsVersion?: string;
  }): Promise<void> {
    const contract = await this.contractRepository.findById(input.contractId);
    if (!contract) throw new NotFoundException('Contract not found');

    const booking = await this.bookingRepository.findById(contract.bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    // Este use case es solo para firma manual interna.
    // Si el contrato está en flujo DocuSign, el cierre lo hace el webhook al COMPLETED.
    const hasDocusignEnvelope = Boolean(contract.snapshotData?.docusign?.envelopeId);
    if (hasDocusignEnvelope) {
      throw new BadRequestException('Contract must be signed via DocuSign flow');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Contract is not signable');
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException('Booking is not ready for contract signing');
    }

    const isAllowed =
      (input.artistId && booking.artistId === input.artistId) ||
      (input.managerId && booking.managerId === input.managerId) ||
      booking.artistId === input.userId ||
      booking.managerId === input.userId;

    if (!isAllowed) {
      throw new ForbiddenException('You are not allowed to sign this contract');
    }

    if (!input.conditionsAccepted) {
      throw new BadRequestException('Contract conditions must be accepted');
    }

    contract.sign({
      signedByUserId: input.userId,
      signedAt: new Date(),
    });
    contract.conditionsAccepted = true;
    contract.conditionsAcceptedAt = new Date();
    if (input.conditionsVersion) {
      (contract as any).conditionsVersion = input.conditionsVersion;
    }

    await this.contractRepository.update(contract);

    booking.status = BookingStatus.CONTRACT_SIGNED;
    await this.bookingRepository.save(booking);

    await this.createPaymentScheduleForBookingUseCase.execute({
      bookingId: booking.id,
    });

    const senderRole: NegotiationSenderRole = input.managerId
      ? NegotiationSenderRole.MANAGER
      : NegotiationSenderRole.ARTIST;

    await notifyBookingCounterpart({
      booking,
      senderRole,
      type: 'CONTRACT_SIGNED',
      notificationsRepo: this.notificationsRepo,
      venueRepository: this.venueRepository,
      promoterRepository: this.promoterRepository,
      managerRepository: this.managerRepository,
    });
  }
}
