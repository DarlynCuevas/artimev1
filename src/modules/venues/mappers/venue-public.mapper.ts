import { VenueEntity } from '../entities/venue.entity';
import { PublicVenueDto } from '../dto/public-venue.dto';

export function mapVenueToPublicDto(
  venue: VenueEntity,
): PublicVenueDto {
  return {
    id: venue.id,
    name: venue.name,
    city: venue.city,
    description: venue.description,
    capacity: venue.capacity ?? undefined,
    address: venue.address ?? undefined,
    genres: venue.genres ?? [],
    images: venue.images ?? [],
  };
}
