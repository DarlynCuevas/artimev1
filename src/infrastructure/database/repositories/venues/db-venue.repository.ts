import { VenueEntity } from "@/src/modules/venues/entities/venue.entity";
import { VenueRepository } from "@/src/modules/venues/repositories/venue.repository.interface";
import { Injectable } from "@nestjs/common";
import { supabase } from "../../supabase.client";
import { BookingStatus } from "@/src/modules/bookings/booking-status.enum";


@Injectable()
export class DbVenueRepository implements VenueRepository {

  private mapRowToEntity(row: any): VenueEntity {
    return {
      id: row.id,
      userId: row.user_id ?? undefined,
      name: row.name,
      city: row.city,
      description: row.description ?? '',
      capacity: row.capacity ?? undefined,
      address: row.address ?? undefined,
      genres: row.genres ?? [],
      images: row.images ?? [],
      amenities: row.amenities ?? [],
      website: row.website ?? undefined,
      contactEmail: row.contact_email ?? row.contactEmail ?? undefined,
      contactPhone: row.contact_phone ?? row.contactPhone ?? undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  async findByUserId(userId: string) {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToEntity(data);
  }

  async findById(id: string): Promise<VenueEntity | null> {

    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapRowToEntity(data);


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

    return (data ?? []).map((row) => this.mapRowToEntity(row));
  }

  async findBookedDates(
    venueId: string,
    from: string,
    to: string,
  ): Promise<string[]> {
    if (!from || !to) {
      throw new Error('Parámetros de fecha inválidos: from y to son requeridos');
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('start_date')
      .eq('venue_id', venueId)
      .in('status', [
        BookingStatus.ACCEPTED,
        BookingStatus.CONTRACT_SIGNED,
        BookingStatus.PAID_PARTIAL,
        BookingStatus.PAID_FULL,
        BookingStatus.COMPLETED,
      ])
      .gte('start_date', from)
      .lte('start_date', to);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Normalizamos a YYYY-MM-DD
    return data.map((b) => b.start_date.slice(0, 10));
  }

  async createForUser(
    userId: string,
    payload: Partial<Pick<VenueEntity, 'name' | 'city' | 'address' | 'capacity' | 'description' | 'genres' | 'amenities' | 'website' | 'contactEmail' | 'contactPhone'>>,
  ): Promise<VenueEntity> {
    const { data, error } = await supabase
      .from('venues')
      .insert({
        user_id: userId,
        name: payload.name,
        city: payload.city ?? null,
        address: payload.address ?? null,
        capacity: payload.capacity ?? null,
        description: payload.description ?? '',
        genres: payload.genres ?? [],
        amenities: payload.amenities ?? [],
        website: payload.website ?? null,
        contact_email: payload.contactEmail ?? null,
        contact_phone: payload.contactPhone ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'VENUE_CREATE_FAILED');
    }

    return this.mapRowToEntity(data);
  }

  async updateProfile(
    venueId: string,
    payload: Partial<Pick<VenueEntity, 'name' | 'city' | 'address' | 'capacity' | 'description' | 'genres' | 'amenities' | 'website' | 'contactEmail' | 'contactPhone'>>,
  ): Promise<VenueEntity> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date(),
    };

    if (payload.name !== undefined) updatePayload.name = payload.name;
    if (payload.city !== undefined) updatePayload.city = payload.city;
    if (payload.address !== undefined) updatePayload.address = payload.address;
    if (payload.capacity !== undefined) updatePayload.capacity = payload.capacity;
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.genres !== undefined) updatePayload.genres = payload.genres;
    if (payload.amenities !== undefined) updatePayload.amenities = payload.amenities;
    if (payload.website !== undefined) updatePayload.website = payload.website;
    if (payload.contactEmail !== undefined) updatePayload.contact_email = payload.contactEmail;
    if (payload.contactPhone !== undefined) updatePayload.contact_phone = payload.contactPhone;

    const { data, error } = await supabase
      .from('venues')
      .update(updatePayload)
      .eq('id', venueId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'VENUE_UPDATE_FAILED');
    }

    return this.mapRowToEntity(data);
  }

}
