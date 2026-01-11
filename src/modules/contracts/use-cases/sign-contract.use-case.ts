// sign-contract.use-case.ts


import { BookingStatus } from '../../bookings/booking-status.enum';
import { ContractStatus } from '../contract.entity';
import { BookingRepository } from '../../../infrastructure/database/repositories/booking.repository';
import { ContractRepository } from '../../../infrastructure/database/repositories/contract.repository';

export class SignContractUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly contractRepository: ContractRepository,
  ) {}

  async execute(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const contract = await this.contractRepository.findByBookingId(booking.id);
    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new Error('Only draft contracts can be signed');
    }

    contract.sign();
    await this.contractRepository.update(contract);

    booking.changeStatus(BookingStatus.CONTRACT_SIGNED);
    await this.bookingRepository.update(booking);
  }
}
