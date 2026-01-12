import { PaymentMilestoneRepository } from '../../../modules/payments/payment-milestone.repository.interface';
import { PaymentMilestone } from '../../../modules/payments/payment-milestone.entity';
import { supabase } from '../supabase.client';

export class DbPaymentMilestoneRepository implements PaymentMilestoneRepository {
  async findById(id: string): Promise<PaymentMilestone | null> {
    const { data, error } = await supabase
      .from('payment_milestones')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return new PaymentMilestone({
      id: data.id,
      bookingId: data.booking_id,
      type: data.type,
      amount: data.amount,
      status: data.status,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
      requiresManualPayment: data.requires_manual_payment,
      providerPaymentId: data.provider_payment_id ?? undefined,
    });
  }

  async findByBookingId(bookingId: string): Promise<PaymentMilestone[]> {
    const { data, error } = await supabase
      .from('payment_milestones')
      .select('*')
      .eq('booking_id', bookingId);
    if (error || !data) return [];
    return data.map((row: any) => new PaymentMilestone({
      id: row.id,
      bookingId: row.booking_id,
      type: row.type,
      amount: row.amount,
      status: row.status,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      requiresManualPayment: row.requires_manual_payment,
      providerPaymentId: row.provider_payment_id ?? undefined,
    }));
  }


  async save(milestone: PaymentMilestone): Promise<void> {
    await supabase.from('payment_milestones').insert({
      id: milestone.id,
      booking_id: milestone.bookingId,
      type: milestone.type,
      amount: milestone.amount,
      status: milestone.status,
      due_date: milestone.dueDate,
      paid_at: milestone.paidAt,
      resolved_at: (milestone as any).resolvedAt ?? undefined,
      requires_manual_payment: milestone.requiresManualPayment(),
      provider_payment_id: milestone.providerPaymentId,
    });
  }

  async update(milestone: PaymentMilestone): Promise<void> {
    await supabase
      .from('payment_milestones')
      .update({
        status: milestone.status,
        paid_at: milestone.paidAt,
        resolved_at: (milestone as any).resolvedAt ?? undefined,
        provider_payment_id: milestone.providerPaymentId,
      })
      .eq('id', milestone.id);
  }

  async delete(id: string): Promise<void> {
    await supabase.from('payment_milestones').delete().eq('id', id);
  }
}
