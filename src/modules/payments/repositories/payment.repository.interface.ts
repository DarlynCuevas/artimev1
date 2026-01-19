export interface PaymentRepository {
  findMainPaymentByBookingId(
    bookingId: string,
  ): Promise<{ providerPaymentId: string } | null>;

  findScheduleByBookingId(
    bookingId: string,
  ): Promise<any | null>;

  findMilestonesByScheduleId(
    scheduleId: string,
  ): Promise<any[]>;

  saveSchedule(schedule: any): Promise<void>;

  saveMilestones(
    milestones: any[],
    scheduleId: string,
  ): Promise<void>;

  updateMilestone(milestone: any): Promise<void>;

  attachProviderPaymentId(
    milestoneId: string,
    providerPaymentId: string,
  ): Promise<void>;
}

