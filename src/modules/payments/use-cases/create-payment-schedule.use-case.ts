// create-payment-schedule.use-case.ts


import { BookingStatus } from '../../bookings/booking-status.enum';
import { SupabaseBookingRepository } from '../../../infrastructure/database/repositories/SupabaseBookingRepository ';
import { PaymentRepository } from '../../../infrastructure/database/repositories/payment.repository';
import { PaymentSchedule } from '../payment-schedule.entity';
import {
  PaymentMilestone,
  PaymentMilestoneType,
} from '../payment-milestone.entity';
import { PaymentMilestoneStatus } from '../payment-milestone-status.enum';


export class CreatePaymentScheduleUseCase {
  constructor(
    private readonly supabaseBookingRepository: SupabaseBookingRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    totalAmount: number;
    currency: string;
    advanceAmount: number;
    finalPaymentDueDate?: Date;
  }): Promise<void> {
    const booking = await this.supabaseBookingRepository.findById(input.bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.CONTRACT_SIGNED) {
      throw new Error(
        'Payment schedule can only be created when booking is in CONTRACT_SIGNED state',
      );
    }

    if (
      input.advanceAmount <= 0 ||
      input.advanceAmount >= input.totalAmount
    ) {
      throw new Error('Invalid advance amount');
    }

    const schedule = new PaymentSchedule({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      totalAmount: input.totalAmount,
      currency: input.currency,
      milestones: [],
      createdAt: new Date(),
    });


    const advanceMilestone = new PaymentMilestone({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      type: PaymentMilestoneType.ADVANCE,
      amount: input.advanceAmount,
      status: PaymentMilestoneStatus.PENDING,
      requiresManualPayment: false, // o true según tu lógica
    });


    const finalMilestone = new PaymentMilestone({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      type: PaymentMilestoneType.FINAL,
      amount: input.totalAmount - input.advanceAmount,
      dueDate: input.finalPaymentDueDate,
      status: PaymentMilestoneStatus.PENDING,
      requiresManualPayment: true, // o false según tu lógica
    });

    await this.paymentRepository.saveSchedule(schedule);
    await this.paymentRepository.saveMilestones(
      [advanceMilestone, finalMilestone],
      schedule.id,
    );
  }
}
