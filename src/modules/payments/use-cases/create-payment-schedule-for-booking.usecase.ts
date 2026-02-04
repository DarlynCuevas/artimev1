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
        console.log('[CreatePaymentScheduleForBookingUseCase] Ejecutando con bookingId:', input.bookingId);
        const booking = await this.bookingRepository.findById(input.bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        const totalAmount = booking.totalAmount ?? 0;
        const currency = booking.currency ?? 'EUR';

        // 1. Ver si ya existe un schedule
        const existingSchedule = await this.paymentRepository.findScheduleByBookingId(input.bookingId);
        console.log('[CreatePaymentScheduleForBookingUseCase] existingSchedule:', existingSchedule);

        if (existingSchedule) {
            const milestones = await this.paymentRepository.findMilestonesByScheduleId(existingSchedule.id);
            console.log('[CreatePaymentScheduleForBookingUseCase] milestones encontrados:', milestones);
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
                console.log('[CreatePaymentScheduleForBookingUseCase] milestone creado y guardado:', milestone);
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
        console.log('[CreatePaymentScheduleForBookingUseCase] schedule creado y guardado:', schedule);

        const milestone = new PaymentMilestone({
            id: milestoneId,
            bookingId: input.bookingId,
            type: PaymentMilestoneType.ADVANCE,
            amount: totalAmount,
            status: PaymentMilestoneStatus.PENDING,
            requiresManualPayment: false,
        });
        await this.paymentRepository.saveMilestones([milestone], scheduleId);
        console.log('[CreatePaymentScheduleForBookingUseCase] milestone creado y guardado:', milestone);

        return {
            scheduleId,
            milestones: [{ id: milestoneId }],
        };
    }
}
