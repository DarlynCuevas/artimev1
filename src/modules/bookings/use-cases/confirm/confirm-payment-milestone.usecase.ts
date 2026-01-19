import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { BookingStatus } from '../../booking-status.enum';
import { StripePaymentProvider } from '@/src/infrastructure/payments/stripe-payment.provider';
import type { PaymentMilestoneRepository } from '@/src/modules/payments/payment-milestone.repository.interface';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BookingStateMachine } from '../../booking-state-machine';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import { PAYMENT_MILESTONE_REPOSITORY } from '@/src/modules/payments/payment-milestone-repository.token';
@Injectable()
export class ConfirmPaymentMilestoneUseCase {
    constructor(
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: BookingRepository,
        @Inject(PAYMENT_MILESTONE_REPOSITORY)
        private readonly milestoneRepository: PaymentMilestoneRepository,
        private readonly stripeProvider: StripePaymentProvider,
    ) { }

    async execute(input: {
        bookingId: string;
        milestoneId: string;
        executedByUserId: string;
    }): Promise<void> {
        const { bookingId, milestoneId } = input;

        // 1. Load booking
        const booking = await this.bookingRepository.findById(bookingId);
        if (!booking) throw new NotFoundException('Booking not found');

        // 2. Load milestone
        const milestone = await this.milestoneRepository.findById(milestoneId);
        if (!milestone) throw new NotFoundException('Milestone not found');

        // 3. Belongs to booking
        if (milestone.bookingId !== booking.id) {
            throw new BadRequestException('Milestone does not belong to booking');
        }

        // 4. Idempotency
        if (milestone.status === 'PAID') return;

        // 5. Provider payment id
        if (!milestone.providerPaymentId) {
            throw new BadRequestException('Milestone has no provider payment id');
        }

        // 6. Fetch PaymentIntent from Stripe
        const pi = await this.stripeProvider.retrievePaymentIntent(
            milestone.providerPaymentId,
        );

        if (!pi) throw new BadRequestException('PaymentIntent not found in Stripe');

        // 7. Stripe status
        if (pi.status !== 'succeeded') {
            throw new BadRequestException('PaymentIntent not succeeded');
        }

        // 8. Amount validation (Stripe amounts are in cents)
        if (pi.amount !== milestone.amount) {
            throw new BadRequestException('Payment amount mismatch');
        }

        // 9. Booking state validation
        if (
            ![BookingStatus.CONTRACT_SIGNED, BookingStatus.PAID_PARTIAL].includes(
                booking.status,
            )
        ) {
            throw new BadRequestException('Booking state not payable');
        }

        // 10. Mark milestone as PAID
        await this.milestoneRepository.markAsPaid(milestone.id, new Date());

        // 11. Advance booking state

        if (booking.status === BookingStatus.CONTRACT_SIGNED) {
            booking.status = BookingStateMachine.transition(
                booking.status,
                BookingStatus.PAID_PARTIAL,
            );
        }

        const remaining =
            await this.milestoneRepository.countUnpaidForBooking(booking.id);

        if (
            booking.status === BookingStatus.PAID_PARTIAL &&
            remaining === 0
        ) {
            booking.status = BookingStateMachine.transition(
                booking.status,
                BookingStatus.PAID_FULL,
            );
        }

        // 12. Persist booking
        await this.bookingRepository.save(booking);
    }
}
