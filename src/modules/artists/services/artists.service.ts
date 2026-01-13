import { Injectable } from '@nestjs/common';
import { supabase } from 'src/infrastructure/database/supabase.client';
import { SupabaseClient } from '@supabase/supabase-js';


@Injectable()
export class ArtistsService {

  async findAll() {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
