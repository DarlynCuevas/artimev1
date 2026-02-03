import { Inject } from '@nestjs/common';
import { PROMOTER_REPOSITORY } from '../repositories/promoter-repository.token';
import type { PromoterRepository } from '../repositories/promoter.repository.interface';
import { Injectable } from '@nestjs/common';
import { GetPromoterProfileQuery } from '../queries/get-promoter-profile.query';
import { UpdatePromoterProfileUseCase } from '../use-cases/update-promoter-profile.usecase';
import { GetEventsQuery } from '../../events/queries/get-events.query';
import { GetPromoterDashboardUseCase } from '../use-cases/dashboard-promoter.usecase';


@Injectable()
export class PromoterService {
  constructor(
    private readonly getPromoterProfileQuery: GetPromoterProfileQuery,
    private readonly updatePromoterProfileUseCase: UpdatePromoterProfileUseCase,
    private readonly getEventsQuery: GetEventsQuery,
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
    private readonly getPromoterDashboardUseCase: GetPromoterDashboardUseCase // Reemplaza 'any' con el tipo correcto cuando esté disponible
  ) {}
  async findByUserId(userId: string) {
    return this.promoterRepository.findByUserId(userId);
  }

  getProfile(promoterId: string) {
    return this.getPromoterProfileQuery.execute(promoterId);
  }

  updateProfile(command: {
    promoterId: string;
    name?: string;
    description?: string;
    city?: string;
    country?: string;
    eventTypes?: string[];
    isPublic?: boolean;
    showPastEvents?: boolean;
  }) {
    return this.updatePromoterProfileUseCase.execute(command);
  }

  getEvents(promoterId: string) {
    return this.getEventsQuery.execute({
      organizerPromoterId: promoterId,
      organizerVenueId: null,
    });
  }

  getPromoterDashboard(promoterId: string) {
   
    // Llama al use case y retorna el resultado
    return this.getPromoterDashboardUseCase.execute(promoterId);
  }
}
