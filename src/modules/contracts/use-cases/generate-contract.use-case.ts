import {
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';
import { Contract } from '../contract.entity';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { ContractRepository } from '@/src/infrastructure/database/repositories/contract.repository';
import { ContractStatus } from '../enum/contractStatus.enum';
import { ContractTemplateMapper } from '../mappers/contract-template.mapper';

@Injectable()
export class GenerateContractUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly contractRepository: ContractRepository,
    private readonly contractTemplateMapper: ContractTemplateMapper,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new ForbiddenException(
        'Contract can only be generated for ACCEPTED bookings',
      );
    }

    const existing =
      await this.contractRepository.findByBookingId(
        booking.id,
      );

    if (existing) {
      throw new ForbiddenException(
        'Contract already exists for this booking',
      );
    }

    const snapshotData = await this.contractTemplateMapper.mapFromBooking(booking);

    const contract = new Contract({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      version: 1,
      status: ContractStatus.DRAFT,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
      artimeCommissionPercentage: booking.artimeCommissionPercentage ?? 0,
      finalOfferId: null,
      signedAt: undefined,
      signedByRole: undefined,
      snapshotData,
      createdAt: new Date(),
      conditionsAccepted: false,
      conditionsAcceptedAt: null,
    });

    await this.contractRepository.save(contract);
  }
}
