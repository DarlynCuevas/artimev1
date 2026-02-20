import { supabase } from '../../supabase.client';

export type ArtistVideoItem = {
  id: string;
  artist_id: string;
  user_id: string;
  youtube_id: string;
  title?: string | null;
  created_at: string;
};

export class ArtistVideoRepository {
  async listByArtistId(artistId: string): Promise<ArtistVideoItem[]> {
    const { data, error } = await supabase
      .from('artist_videos')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ArtistVideoItem[];
  }

  async countByArtistId(artistId: string): Promise<number> {
    const { count, error } = await supabase
      .from('artist_videos')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId);

    if (error) return 0;
    return count ?? 0;
  }

  async findById(id: string): Promise<ArtistVideoItem | null> {
    const { data, error } = await supabase
      .from('artist_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as ArtistVideoItem;
  }

  async insert(item: { artist_id: string; user_id: string; youtube_id: string; title?: string | null }): Promise<void> {
    const { error } = await supabase.from('artist_videos').insert(item);
    if (error) throw new Error(error.message);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await supabase.from('artist_videos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
