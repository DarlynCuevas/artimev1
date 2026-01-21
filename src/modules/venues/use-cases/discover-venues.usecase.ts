import { Injectable } from '@nestjs/common';
import { VenuesService } from '../services/venues.service';

@Injectable()
export class DiscoverVenuesUseCase {
  constructor(
    private readonly venuesService: VenuesService,
  ) {}

  async execute(filters?: {
    city?: string;
    genres?: string[];
  }) {
    return this.venuesService.discover(filters);
  }
}

