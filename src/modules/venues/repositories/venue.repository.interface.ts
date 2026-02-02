import { VenueEntity } from '../entities/venue.entity';

export interface VenueRepository {
  findById(id: string): Promise<VenueEntity | null>;

  findByUserId(userId: string): Promise<VenueEntity | null>;


  findForDiscover(filters?: {
    city?: string;
    genres?: string[];
  }): Promise<VenueEntity[]>;

  createForUser(
    userId: string,
    payload: Partial<Pick<VenueEntity,
      'name' | 'city' | 'address' | 'capacity' | 'description' | 'genres' | 'amenities' | 'website' | 'contactEmail' | 'contactPhone'
    >>,
  ): Promise<VenueEntity>;

  updateProfile(
    venueId: string,
    payload: Partial<Pick<VenueEntity,
      'name' | 'city' | 'address' | 'capacity' | 'description' | 'genres' | 'amenities' | 'website' | 'contactEmail' | 'contactPhone'
    >>,
  ): Promise<VenueEntity>;
}
