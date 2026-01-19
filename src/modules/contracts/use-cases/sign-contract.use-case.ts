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

@Injectable()
export class SignContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly createPaymentScheduleForBookingUseCase: CreatePaymentScheduleForBookingUseCase,
  ) { }

  async execute(input: {
    contractId: string;
    userId: string;
    conditionsAccepted: boolean;
    conditionsVersion?: string;
  }): Promise<void> {

    // 1. Cargar contrato por ID
    const contract = await this.contractRepository.findById(
      input.contractId,
    );

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // 2. Validar estado del contrato
    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Contract is not signable');
    }

    // 3. Cargar booking asociado al contrato
    const booking = await this.bookingRepository.findById(
      contract.bookingId,
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // 4. Validar estado del booking
    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException(
        'Booking is not ready for contract signing',
      );
    }

    // 5. Validar permisos (v1)
    const isAllowed =
      booking.artistId === input.userId ||
      booking.managerId === input.userId;

    if (!isAllowed) {
      throw new ForbiddenException(
        'You are not allowed to sign this contract',
      );
    }

    // 6. Firmar contrato
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
    await this.createPaymentScheduleForBookingUseCase.execute({
      bookingId: booking.id,
    })

    // 7. Actualizar booking
    booking.status = BookingStatus.CONTRACT_SIGNED;
    await this.bookingRepository.save(booking);
  }
}
