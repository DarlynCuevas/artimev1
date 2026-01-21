import { VenueEntity } from "@/src/modules/venues/entities/venue.entity";
import { VenueRepository } from "@/src/modules/venues/repositories/venue.repository.interface";
import { Injectable } from "@nestjs/common";
import { supabase } from "../../supabase.client";


@Injectable()
export class DbVenueRepository implements VenueRepository {
  async findById(id: string): Promise<VenueEntity | null> {
    
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      city: data.city,
      description: data.description,
      capacity: data.capacity ?? undefined,
      address: data.address ?? undefined,
      genres: data.genres ?? [],
      images: data.images ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async findForDiscover(filters?: {
  city?: string;
  genres?: string[];
}): Promise<VenueEntity[]> {
  let query = supabase
    .from('venues')
    .select('id, name, city, genres');

  if (filters?.city) {
    query = query.eq('city', filters.city);
  }

  if (filters?.genres?.length) {
    query = query.overlaps('genres', filters.genres);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    city: v.city,
    description: '', // no se necesita en discover
    genres: v.genres ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

}
