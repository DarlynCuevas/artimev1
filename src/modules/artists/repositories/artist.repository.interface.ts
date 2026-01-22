import { Artist } from "../entities/artist.entity";


export interface ArtistRepository {
  findById(id: string): Promise<Artist | null>;
  findByUserId(userId: string): Promise<Artist | null>;
  update(artist: Artist): Promise<void>;
  findByStripeAccountId(stripeAccountId: string): Promise<Artist | null>;
  findAvailableForDate(filters: {
    date: string
    city?: string
    genre?: string
    minPrice?: number
    maxPrice?: number
    search?: string
  }): Promise<Array<{
    artistId: string
    name: string
    city: string
    genres: string[]
    basePrice: number
    currency: string
    isNegotiable: boolean
    rating?: number
  }>>;

  findPublicProfileById(id: string): Promise<{
    id: string;
    name: string;
    city: string;
    genres: string[];
    bio?: string;
    format?: string;
    basePrice: number;
    currency: string;
    isNegotiable: boolean;
    rating?: number;
    managerId?: string;
    managerName?: string;
  } | null>;

  findForDiscover(): Promise<any[]>;

  findBookedDates(artistId, from, to): Promise<string[]>
  findByIds(ids: string[]): Promise<Artist[]>;

  updateProfile(
    artistId: string,
    payload: {
      name?: string;
      city?: string;
      genres?: string[];
      bio?: string;
      format?: string;
      basePrice?: number;
      currency?: string;
      isNegotiable?: boolean;
      managerId?: string | null;
      rating?: number;
    },
  ): Promise<void>;

}
