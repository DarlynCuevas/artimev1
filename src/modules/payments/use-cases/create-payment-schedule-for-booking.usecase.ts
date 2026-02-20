import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import type { PaymentRepository } from '../repositories/payment.repository.interface';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';
import { Inject } from '@nestjs/common';
import { PAYMENT_REPOSITORY } from '../repositories/payment.repository.token';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import { PaymentSchedule } from '../payment-schedule.entity';
import { PaymentMilestone, PaymentMilestoneType } from '../payment-milestone.entity';
import { PaymentMilestoneStatus } from '../payment-milestone-status.enum';

@Injectable()
export class CreatePaymentScheduleForBookingUseCase {
    constructor(
        @Inject(PAYMENT_REPOSITORY)
        private readonly paymentRepository: PaymentRepository,
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: BookingRepository,
    ) { }

    async execute(input: { bookingId: string }) {
        // ...existing code...
        const booking = await this.bookingRepository.findById(input.bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        const totalAmount = booking.totalAmount ?? 0;
        const currency = booking.currency ?? 'EUR';

        // 1. Ver si ya existe un schedule
        const existingSchedule = await this.paymentRepository.findScheduleByBookingId(input.bookingId);
        // ...existing code...

        if (existingSchedule) {
            const milestones = await this.paymentRepository.findMilestonesByScheduleId(existingSchedule.id);
            // ...existing code...
            if (milestones.length === 0) {
                const milestoneId = uuid();
                const milestone = new PaymentMilestone({
                    id: milestoneId,
                    bookingId: input.bookingId,
                    type: PaymentMilestoneType.ADVANCE,
                    amount: totalAmount,
                    status: PaymentMilestoneStatus.PENDING,
                    requiresManualPayment: false,
                });
                await this.paymentRepository.saveMilestones([milestone], existingSchedule.id);
                // ...existing code...
            }
            return {
                scheduleId: existingSchedule.id,
                milestones: milestones.map((m) => ({ id: m.id })),
            };
        }

        // 2. Si no existe, crearlo
        const scheduleId = uuid();
        const milestoneId = uuid();

        const schedule = new PaymentSchedule({
            id: scheduleId,
            bookingId: input.bookingId,
            totalAmount,
            currency,
            milestones: [],
            createdAt: new Date(),
        });
        await this.paymentRepository.saveSchedule(schedule);
        // ...existing code...

        const milestone = new PaymentMilestone({
            id: milestoneId,
            bookingId: input.bookingId,
            type: PaymentMilestoneType.ADVANCE,
            amount: totalAmount,
            status: PaymentMilestoneStatus.PENDING,
            requiresManualPayment: false,
        });
        await this.paymentRepository.saveMilestones([milestone], scheduleId);
        // ...existing code...

        return {
            scheduleId,
            milestones: [{ id: milestoneId }],
        };
    }
}
