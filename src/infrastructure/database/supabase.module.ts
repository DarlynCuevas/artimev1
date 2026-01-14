import { Module } from '@nestjs/common';
import { supabase } from './supabase.client';
import { SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useValue: supabase as SupabaseClient,
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}

/* Ejemplo de uso en un servicio/repo:
constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}
*/
