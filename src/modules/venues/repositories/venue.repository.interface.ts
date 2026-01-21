import { VenueEntity } from '../entities/venue.entity';

export interface VenueRepository {
  findById(id: string): Promise<VenueEntity | null>;

  findByUserId(userId: string): Promise<VenueEntity | null>;


  findForDiscover(filters?: {
    city?: string;
    genres?: string[];
  }): Promise<VenueEntity[]>;
}
