// payment.repository.ts

import { supabase } from '../supabase.client';
import { PaymentSchedule } from '../../../modules/payments/payment-schedule.entity';
import { PaymentMilestone } from '../../../modules/payments/payment-milestone.entity';

export class PaymentRepository {
      async attachProviderPaymentId(
        milestoneId: string,
        providerPaymentId: string,
      ): Promise<void> {
        await supabase
          .from('payment_milestones')
          .update({ provider_payment_id: providerPaymentId })
          .eq('id', milestoneId);
      }
    async findMilestonesByScheduleId(
      scheduleId: string,
    ): Promise<PaymentMilestone[]> {
      const { data, error } = await supabase
        .from('payment_milestones')
        .select('*')
        .eq('payment_schedule_id', scheduleId);

      if (error || !data) {
        return [];
      }

      return data.map(
        (row: any) =>
          new PaymentMilestone({
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
          }),
      );
    }

    async updateMilestone(milestone: PaymentMilestone): Promise<void> {
      await supabase
        .from('payment_milestones')
        .update({
          paid_at: milestone.paidAt,
        })
        .eq('id', milestone.id);
    }
  async saveSchedule(schedule: PaymentSchedule): Promise<void> {
    await supabase.from('payment_schedules').insert({
      id: schedule.id,
      booking_id: schedule.bookingId,
      total_amount: schedule.totalAmount,
      currency: schedule.currency,
      created_at: new Date(),
    });
  }

  async saveMilestones(
    milestones: PaymentMilestone[],
    scheduleId: string,
  ): Promise<void> {
    const rows = milestones.map((m) => ({
      id: m.id,
      payment_schedule_id: scheduleId,
      type: m.type,
      amount: m.amount,
      due_date: m.dueDate ?? null,
      paid_at: null,
    }));

    await supabase.from('payment_milestones').insert(rows);
  }

  async findScheduleByBookingId(
    bookingId: string,
  ): Promise<PaymentSchedule | null> {
    const { data, error } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error || !data) {
      return null;
    }

    return new PaymentSchedule({
      id: data.id,
      bookingId: data.booking_id,
      totalAmount: data.total_amount,
      currency: data.currency,
      milestones: [],
      createdAt: new Date(data.created_at),
    });
  }
}
