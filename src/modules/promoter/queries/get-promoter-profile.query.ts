import { Inject } from '@nestjs/common';
import type { PromoterRepository } from '../repositories/promoter.repository.interface';
import { PROMOTER_REPOSITORY } from '../repositories/promoter-repository.token';

export class GetPromoterProfileQuery {
  constructor(
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
  ) {}

  async execute(promoterId: string) {
    const promoter = await this.promoterRepository.findById(promoterId);

    if (!promoter) {
      throw new Error('PROMOTER_NOT_FOUND');
    }

    return {
      id: promoter.id,
      name: promoter.name,
      createdAt: promoter.created_at,
    };
  }
}
