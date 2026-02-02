import { Inject } from '@nestjs/common';
import type { PromoterRepository } from '../repositories/promoter.repository.interface';
import { PROMOTER_REPOSITORY } from '../repositories/promoter-repository.token';

export interface UpdatePromoterProfileCommand {
  promoterId: string;
  name?: string;
  description?: string;
}

export class UpdatePromoterProfileUseCase {
  constructor(
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
  ) {}

  async execute(command: UpdatePromoterProfileCommand): Promise<void> {
    const promoter = await this.promoterRepository.findById(command.promoterId);

    if (!promoter) {
      throw new Error('PROMOTER_NOT_FOUND');
    }

    await this.promoterRepository.update({
      id: promoter.id,
      name: command.name,
      description: command.description,
    });
  }
}
