import { supabase } from '../../supabase.client';

export type ArtistGalleryItem = {
  id: string;
  artist_id: string;
  user_id: string;
  path: string;
  created_at: string;
};

export class ArtistGalleryRepository {
  async listByArtistId(artistId: string): Promise<ArtistGalleryItem[]> {
    const { data, error } = await supabase
      .from('artist_gallery')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ArtistGalleryItem[];
  }

  async countByArtistId(artistId: string): Promise<number> {
    const { count, error } = await supabase
      .from('artist_gallery')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId);

    if (error) return 0;
    return count ?? 0;
  }

  async findById(id: string): Promise<ArtistGalleryItem | null> {
    const { data, error } = await supabase
      .from('artist_gallery')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as ArtistGalleryItem;
  }

  async insert(item: { artist_id: string; user_id: string; path: string }): Promise<void> {
    const { error } = await supabase.from('artist_gallery').insert(item);
    if (error) throw new Error(error.message);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await supabase.from('artist_gallery').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
