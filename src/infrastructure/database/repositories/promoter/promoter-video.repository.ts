import { supabase } from '../../supabase.client';

export type PromoterVideoItem = {
  id: string;
  promoter_id: string;
  user_id: string;
  youtube_id: string;
  title?: string | null;
  created_at: string;
};

export class PromoterVideoRepository {
  async listByPromoterId(promoterId: string): Promise<PromoterVideoItem[]> {
    const { data, error } = await supabase
      .from('promoter_videos')
      .select('*')
      .eq('promoter_id', promoterId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as PromoterVideoItem[];
  }

  async countByPromoterId(promoterId: string): Promise<number> {
    const { count, error } = await supabase
      .from('promoter_videos')
      .select('id', { count: 'exact', head: true })
      .eq('promoter_id', promoterId);

    if (error) return 0;
    return count ?? 0;
  }

  async findById(id: string): Promise<PromoterVideoItem | null> {
    const { data, error } = await supabase
      .from('promoter_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as PromoterVideoItem;
  }

  async insert(item: { promoter_id: string; user_id: string; youtube_id: string; title?: string | null }): Promise<void> {
    const { error } = await supabase.from('promoter_videos').insert(item);
    if (error) throw new Error(error.message);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await supabase.from('promoter_videos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
