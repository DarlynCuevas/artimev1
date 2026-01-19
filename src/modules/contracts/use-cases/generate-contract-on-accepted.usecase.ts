import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';
import { BookingStatus } from '../../bookings/booking-status.enum';
import { ContractRepository } from '../../../infrastructure/database/repositories/contract.repository';
import { Contract } from '../contract.entity';
import { ContractStatus } from '../enum/contractStatus.enum';

@Injectable()
export class GenerateContractOnAcceptedUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly contractRepository: ContractRepository,
  ) {}

  async execute(bookingId: string): Promise<void> {
    // 1. Cargar booking
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    // 2. Validar estado
    if (booking.status !== BookingStatus.ACCEPTED) {
      return;
    }

    // 3. Evitar duplicados
    const existing =
      await this.contractRepository.findByBookingId(bookingId);

    if (existing) {
      return;
    }


    // 4. Crear contrato (consolidación del acuerdo)
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
      snapshotData: {},
      createdAt: new Date(),
      conditionsAccepted: false,
      conditionsAcceptedAt: null,
    });

    // 5. Guardar contrato
    await this.contractRepository.save(contract);
  }
}
