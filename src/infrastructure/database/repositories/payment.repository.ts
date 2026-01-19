// payment.repository.ts

import { supabase } from '../supabase.client';
import { PaymentSchedule } from '../../../modules/payments/payment-schedule.entity';
import { PaymentMilestone } from '../../../modules/payments/payment-milestone.entity';
import { PaymentRepository } from '@/src/modules/payments/repositories/payment.repository.interface';
export class DbPaymentRepository implements PaymentRepository {
  async attachProviderPaymentId(
    milestoneId: string,
    providerPaymentId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_milestones')
      .update({ provider_payment_id: providerPaymentId })
      .eq('id', milestoneId);

    if (error) {
      throw new Error(`ATTACH_PROVIDER_PAYMENT_ID_FAILED: ${error.message}`);
    }
  }

  async findMilestonesByScheduleId(
    scheduleId: string,
  ): Promise<PaymentMilestone[]> {
    const { data, error } = await supabase
      .from('payment_milestones')
      .select('*')
      .eq('payment_schedule_id', scheduleId);

    if (error) {
      throw new Error(`FIND_MILESTONES_FAILED: ${error.message}`);
    }

    if (!data) {
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
    const { error } = await supabase
      .from('payment_milestones')
      .update({
        paid_at: milestone.paidAt,
        resolved_at: milestone.resolvedAt ?? null,
        status: milestone.status,
      })
      .eq('id', milestone.id);

    if (error) {
      throw new Error(`UPDATE_MILESTONE_FAILED: ${error.message}`);
    }
  }

  async saveSchedule(schedule: PaymentSchedule): Promise<void> {
    const { error } = await supabase.from('payment_schedules').insert({
      id: schedule.id,
      booking_id: schedule.bookingId,
      total_amount: schedule.totalAmount,
      currency: schedule.currency,
      created_at: schedule.createdAt ?? new Date(),
    });

    if (error) {
      throw new Error(`SAVE_SCHEDULE_FAILED: ${error.message}`);
    }
  }

  async saveMilestones(
    milestones: PaymentMilestone[],
    scheduleId: string,
  ): Promise<void> {
    const rows = milestones.map((m) => ({
      id: m.id,
      payment_schedule_id: scheduleId,
      booking_id: m.bookingId,
      type: m.type,
      amount: m.amount,
      status: m.status ?? 'PENDING',
      requires_manual_payment: m.requiresManualPayment(),
      due_date: m.dueDate ?? null,
      paid_at: m.paidAt ?? null,
      resolved_at: m.resolvedAt ?? null,
    }));

    const { data, error } = await supabase
      .from('payment_milestones')
      .insert(rows)
      .select('*');

    if (error) {
      throw new Error(`SAVE_MILESTONES_FAILED: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('SAVE_MILESTONES_FAILED: no rows inserted');
    }
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

  async findMainPaymentByBookingId(
    bookingId: string,
  ): Promise<{ providerPaymentId: string } | null> {
    const schedule = await this.findScheduleByBookingId(bookingId);

    if (!schedule) {
      return null;
    }

    const milestones = await this.findMilestonesByScheduleId(schedule.id);

    const mainMilestone = milestones.find(
      (m) => !!m.providerPaymentId,
    );

    if (!mainMilestone) {
      return null;
    }

    return {
      providerPaymentId: mainMilestone.providerPaymentId!,
    };
  }
}

