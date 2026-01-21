export class PublicVenueDto {
  id: string;
  name: string;
  city: string;
  description: string;

  capacity?: number;
  address?: string;
  genres?: string[];
  images?: string[];
}
