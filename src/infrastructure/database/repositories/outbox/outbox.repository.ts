import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase.module';

export type OutboxEvent = {
  id: string;
  type: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  attempt_count: number;
  created_at: string;
  updated_at?: string;
};

@Injectable()
export class OutboxRepository {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async enqueue(params: { type: string; payload: Record<string, any> }) {
    const { data, error } = await this.supabase
      .from('outbox_events')
      .insert({
        type: params.type,
        payload: params.payload,
        status: 'PENDING',
        attempt_count: 0,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as OutboxEvent;
  }

  async fetchPending(limit = 10) {
    const { data, error } = await this.supabase
      .from('outbox_events')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []) as OutboxEvent[];
  }

  async markProcessing(id: string, currentAttempt: number) {
    const { data, error } = await this.supabase
      .from('outbox_events')
      .update({
        status: 'PROCESSING',
        attempt_count: currentAttempt + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'PENDING')
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as OutboxEvent;
  }

  async markProcessed(id: string) {
    const { error } = await this.supabase
      .from('outbox_events')
      .update({ status: 'PROCESSED', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async markFailed(id: string, attemptCount: number) {
    const { error } = await this.supabase
      .from('outbox_events')
      .update({
        status: 'FAILED',
        attempt_count: attemptCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
}
