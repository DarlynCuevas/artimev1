import { Inject, Injectable } from '@nestjs/common';
import { Payout, PayoutStatus } from '../../entities/payout.entity';
import { PAYOUT_REPOSITORY } from '../../repositories/payout.repository.token';
import type { PayoutRepository } from '../../repositories/payout.repository';
import { SplitCalculator } from '../../split/split-calculator.service';
import { BOOKING_REPOSITORY } from 'src/modules/bookings/repositories/booking-repository.token';
import type { BookingRepository } from 'src/modules/bookings/repositories/booking.repository.interface';
import { BookingStatus } from 'src/modules/bookings/booking-status.enum';
const eligibleStatuses = [
    BookingStatus.COMPLETED,
    BookingStatus.PAID_FULL,
];
@Injectable()
export class CreatePayoutForBookingUseCase {
    constructor(
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: BookingRepository,
        @Inject(PAYOUT_REPOSITORY)
        private readonly payoutRepository: PayoutRepository,
        private readonly splitCalculator: SplitCalculator,
    ) { }


    async execute(input: { bookingId: string }): Promise<Payout> {
        console.log('BOOKING ID RECEIVED →', input.bookingId);

const booking = await this.bookingRepository.findById(input.bookingId);

console.log('BOOKING FOUND →', booking);
       



        if (!booking) {
            throw new Error('Booking not found');
        }

        const eligibleStatuses = [
            BookingStatus.COMPLETED,
            BookingStatus.PAID_FULL,
        ];

        if (!eligibleStatuses.includes(booking.status)) {
            throw new Error('Booking not eligible for payout');
        }


        const split = this.splitCalculator.calculateForPayout({
            bookingId: booking.id,
            totalAmount: booking.totalAmount,
            artimeCommissionPercentage: booking.artimeCommissionPercentage ?? 0,
            managerId: booking.managerId,
            managerCommissionPercentage: booking.managerCommissionPercentage ?? 0,
            currency: booking.currency,
        });

        const payout = new Payout(
            crypto.randomUUID(),
            booking.id,
            booking.artistId,
            booking.managerId ?? null,
            split.grossAmount,
            split.artimeFee,
            split.managerFee,
            split.artistNet,
            booking.currency,
            PayoutStatus.READY_TO_PAY,
        );

        await this.payoutRepository.save(payout);

        return payout;
    }
}
