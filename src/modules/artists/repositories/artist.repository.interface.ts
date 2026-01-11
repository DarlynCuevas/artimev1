import { Artist } from "../entities/artist.entity";


export interface ArtistRepository {
  findById(id: string): Promise<Artist | null>;
  update(artist: Artist): Promise<void>;
}
