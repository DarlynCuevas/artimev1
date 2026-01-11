import type { BookingRepository } from '../../../bookings/repositories/booking.repository.interface';

import { Inject } from '@nestjs/common';
import { SPLIT_SUMMARY_REPOSITORY } from '../../split/split-summary.tokens';
import { BOOKING_REPOSITORY } from '../../../bookings/repositories/booking-repository.token';
import { PAYOUT_REPOSITORY } from './payout-repository.token';
import { PAYMENT_PROVIDER } from '../../providers/payment-provider.token';
import type { SplitSummaryRepository } from '../../split/split-summary.repository.interface';
import type { PayoutRepository } from '../../../../infrastructure/database/repositories/payout.repository';

import { BookingStatus } from '../../../bookings/booking-status.enum';

import type { PaymentProvider } from '../../providers/payment-provider.interface';
import { PayoutRecord } from './entities/payout-record.entity';

export class ExecutePayoutUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    @Inject(SPLIT_SUMMARY_REPOSITORY)
    private readonly splitSummaryRepository: SplitSummaryRepository,
    @Inject(PAYOUT_REPOSITORY)
    private readonly payoutRepository: PayoutRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async execute(input: { bookingId: string }): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);

    if (!booking || booking.status !== BookingStatus.PAID_FULL) {
      throw new Error('Booking not eligible for payout');
    }

    const existingPayout =
      await this.payoutRepository.findByBookingId(booking.id);

    if (existingPayout) {
      throw new Error('Payout already executed');
    }

    const split =
      await this.splitSummaryRepository.findByBookingId(booking.id);

    if (!split) {
      throw new Error('Split summary not found');
    }

    // Payout artist
    await this.paymentProvider.createPayout({
      amount: split.artistNetAmount,
      currency: split.currency,
      destinationAccountId: booking.artistStripeAccountId,
    });

    // Payout manager (optional)
    if (split.managerInvolved && split.managerCommission > 0) {
      await this.paymentProvider.createPayout({
        amount: split.managerCommission,
        currency: split.currency,
        destinationAccountId: booking.managerStripeAccountId!,
      });
    }

    // Record payout
    const record = new PayoutRecord({
      bookingId: booking.id,
      artistAmount: split.artistNetAmount,
      managerAmount: split.managerCommission,
      artimeAmount: split.artimeCommission,
      currency: split.currency,
      executedAt: new Date(),
    });

    await this.payoutRepository.save(record);

    // Close booking
    booking.changeStatus(BookingStatus.COMPLETED);
    await this.bookingRepository.update(booking);
  }
}
