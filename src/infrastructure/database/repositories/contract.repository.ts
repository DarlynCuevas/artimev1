import { supabase } from '../supabase.client';
import { Contract } from '../../../modules/contracts/contract.entity';
import { ContractStatus } from '@/src/modules/contracts/enum/contractStatus.enum';


export class ContractRepository {
  
  async save(contract: Contract): Promise<void> {
    const persistence = {
      id: contract.id,
      booking_id: contract.bookingId,
      version: contract.version,
      status: contract.status as ContractStatus,
      currency: contract.currency,
      total_amount: contract.totalAmount,
      artime_commission_percentage: contract.artimeCommissionPercentage,
      final_offer_id: contract.finalOfferId ?? null,
      signed_at: contract.signedAt ?? null,
      signed_by_role: contract.signedByRole ?? null,
      snapshot_data: contract.snapshotData,
      created_at: contract.createdAt,
      conditions_accepted: contract.conditionsAccepted,
      conditions_accepted_at: contract.conditionsAcceptedAt ?? null,
      conditions_version: contract.conditionsVersion ?? null,
    };


    const { error, data } = await supabase.from('contracts').insert(persistence);
    if (error) {
      console.error('Error al insertar contrato:', error);
    } else {
    }
  }
  async update(contract: Contract): Promise<void> {
    await supabase
      .from('contracts')
      .update({
        status: contract.status,
        signed_at: contract.signedAt,
        signed_by_role: contract.signedByRole,
        conditions_accepted: contract.conditionsAccepted,
        conditions_accepted_at: contract.conditionsAcceptedAt ?? null,
        conditions_version: contract.conditionsVersion ?? null,
        snapshot_data: contract.snapshotData,
      })
      .eq('id', contract.id);
  }


  async findByBookingId(
    bookingId: string,
  ): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error || !data) {
      return null;
    }

    return new Contract({
      id: data.id,
      bookingId: data.booking_id,
      version: data.version,
      status: data.status as ContractStatus,
      currency: data.currency,
      totalAmount: data.total_amount,
      artimeCommissionPercentage: data.artime_commission_percentage,
      finalOfferId: data.final_offer_id,
      signedAt: data.signed_at ? new Date(data.signed_at) : null,
      signedByRole: data.signed_by_role,
      snapshotData: data.snapshot_data,
      createdAt: new Date(data.created_at),
      conditionsAccepted: data.conditions_accepted,
      conditionsAcceptedAt: data.conditions_accepted_at ? new Date(data.conditions_accepted_at) : null,
      conditionsVersion: data.conditions_version ?? undefined,
    });
  }

  async findById(contractId: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single();

  if (error || !data) {
    return null;
  }

  return Contract.fromPersistence(data);
}

}
