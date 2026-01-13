// generate-contract.use-case.ts

import { BookingStatus } from '../../bookings/booking-status.enum';
import {
  Contract,
  ContractStatus,
} from '../contract.entity';
import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/SupabaseBookingRepository ';
import { ContractRepository } from '../../../infrastructure/database/repositories/contract.repository';

export class GenerateContractUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly contractRepository: ContractRepository,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.supabaseBookingRepository.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new Error(
        'Contract can only be generated when booking is in ACCEPTED state',
      );
    }

    const contract = new Contract({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      version: 1,
      status: ContractStatus.DRAFT,
      createdAt: new Date(),
    });

    await this.contractRepository.save(contract);
  }
}
