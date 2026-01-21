export class VenueEntity {
  id: string;
  name: string;
  city: string;
  description: string;

  capacity?: number;
  address?: string;
  genres?: string[];
  images?: string[];

  createdAt: Date;
  updatedAt: Date;
}
