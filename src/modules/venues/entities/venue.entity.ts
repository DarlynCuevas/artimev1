export class VenueEntity {
  id: string;
  userId?: string;
  name: string;
  city: string;
  description: string;

  capacity?: number;
  address?: string;
  genres?: string[];
  images?: string[];
  amenities?: string[];
  website?: string;
  contactEmail?: string;
  contactPhone?: string;

  createdAt: Date;
  updatedAt: Date;
}
