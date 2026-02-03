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
      return {
        id: promoterId,
        name: 'Promotor',
        city: null,
        country: null,
        description: null,
        eventTypes: [],
        isPublic: null,
        showPastEvents: null,
        createdAt: null,
      };
    }

    return {
      id: promoter.id,
      name: promoter.name,
      city: promoter.city ?? null,
      country: promoter.country ?? null,
      description: promoter.description ?? null,
      eventTypes: promoter.event_types ?? [],
      isPublic: promoter.is_public ?? null,
      showPastEvents: promoter.show_past_events ?? null,
      createdAt: promoter.created_at,
    };
  }
}
