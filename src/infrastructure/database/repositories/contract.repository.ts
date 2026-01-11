// contract.repository.ts

import { supabase } from '../supabase.client';
import {
  Contract,
  ContractStatus,
} from '../../../modules/contracts/contract.entity';

export class ContractRepository {
    async update(contract: Contract): Promise<void> {
      await supabase
        .from('contracts')
        .update({
          status: contract.status,
          signed_at: contract.signedAt ?? null,
        })
        .eq('id', contract.id);
    }
  async save(contract: Contract): Promise<void> {
    const persistence = {
      id: contract.id,
      booking_id: contract.bookingId,
      version: contract.version,
      status: contract.status,
      created_at: contract.createdAt,
      signed_at: contract.signedAt ?? null,
    };

    await supabase.from('contracts').insert(persistence);
  }

  async findByBookingId(
    bookingId: string,
  ): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('booking_id', bookingId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return new Contract({
      id: data.id,
      bookingId: data.booking_id,
      version: data.version,
      status: data.status as ContractStatus,
      createdAt: new Date(data.created_at),
      signedAt: data.signed_at
        ? new Date(data.signed_at)
        : undefined,
    });
  }
}
