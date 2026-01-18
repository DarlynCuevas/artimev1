import { ForbiddenException, Injectable, Inject } from '@nestjs/common';
import { ContractRepository } from '../../../infrastructure/database/repositories/contract.repository';
import { ContractStatus } from '../enum/contractStatus.enum';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';


@Injectable()
export class SignContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly bookingRepository: BookingRepository,
  ) { }

  async execute(input: {
    bookingId: string;
    userId: string;
  }): Promise<void> {
    const booking = await this.bookingRepository.findById(
      input.bookingId,
    );
    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    const contract =
      await this.contractRepository.findByBookingId(
        input.bookingId,
      );

    if (!contract) {
      throw new ForbiddenException('Contract not found');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new ForbiddenException(
        'Contract cannot be signed',
      );
    }

    const isAllowed =
      booking.artistId === input.userId ||
      booking.managerId === input.userId ||
      booking.venueId === input.userId ||
      booking.promoterId === input.userId;

    if (!isAllowed) {
      throw new ForbiddenException(
        'You are not allowed to sign this contract',
      );
    }

    contract.sign({
      signedByUserId: input.userId,
      signedAt: new Date(),
    });

    await this.contractRepository.update(contract);
  }

}
