import { Injectable, NotFoundException } from '@nestjs/common';
import { ContractRepository } from '../../../infrastructure/database/repositories/contract.repository';

@Injectable()
export class GetContractByBookingUseCase {
  constructor(
    private readonly contractsRepository: ContractRepository,
  ) {}

  async execute(bookingId: string) {
    const contract = await this.contractsRepository.findByBookingId(bookingId);

    if (!contract) {
      throw new NotFoundException('Contract not found for booking');
    }

    return contract;
  }
}
