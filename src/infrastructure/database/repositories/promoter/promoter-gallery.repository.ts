import { supabase } from '../../supabase.client';

export type PromoterGalleryItem = {
  id: string;
  promoter_id: string;
  user_id: string;
  path: string;
  created_at: string;
};

export class PromoterGalleryRepository {
  async listByPromoterId(promoterId: string): Promise<PromoterGalleryItem[]> {
    const { data, error } = await supabase
      .from('promoter_gallery')
      .select('*')
      .eq('promoter_id', promoterId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as PromoterGalleryItem[];
  }

  async countByPromoterId(promoterId: string): Promise<number> {
    const { count, error } = await supabase
      .from('promoter_gallery')
      .select('id', { count: 'exact', head: true })
      .eq('promoter_id', promoterId);

    if (error) return 0;
    return count ?? 0;
  }

  async findById(id: string): Promise<PromoterGalleryItem | null> {
    const { data, error } = await supabase
      .from('promoter_gallery')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as PromoterGalleryItem;
  }

  async insert(item: { promoter_id: string; user_id: string; path: string }): Promise<void> {
    const { error } = await supabase.from('promoter_gallery').insert(item);
    if (error) throw new Error(error.message);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await supabase.from('promoter_gallery').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
