import { ExecutePayoutUseCase } from '../__future__/execute-payout.use-case';
import { BookingStatus } from '../../../bookings/booking-status.enum';
import { SplitSummary } from '../../split/split-summary.entity';
import { PayoutRecord } from './entities/payout-record.entity';

describe('ExecutePayoutUseCase', () => {
  it('executes payouts and completes booking', async () => {
    const booking = {
      id: 'booking-1',
      status: BookingStatus.PAID_FULL,
      artistStripeAccountId: 'acct_artist',
      managerStripeAccountId: 'acct_manager',
      changeStatus: jest.fn(),
    };

    const split = new SplitSummary({
      bookingId: 'booking-1',
      artistFee: 2000,
      artimeCommission: 200,
      managerInvolved: true,
      managerCommission: 300,
      paymentCosts: 15,
      artistNetAmount: 1700,
      totalPayable: 2215,
      currency: 'EUR',
      frozenAt: new Date(),
    });

    const bookingRepository = {
      findById: jest.fn().mockResolvedValue(booking),
      update: jest.fn(),
    };

    const splitSummaryRepository = {
      findByBookingId: jest.fn().mockResolvedValue(split),
    };

    const payoutRepository = {
      findByBookingId: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };

    const paymentProvider = {
      createPayout: jest.fn(),
    };

    const useCase = new ExecutePayoutUseCase(
      bookingRepository as any,
      splitSummaryRepository as any,
      payoutRepository as any,
      paymentProvider as any,
    );

    await useCase.execute({ bookingId: 'booking-1' });

    // Artist payout
    expect(paymentProvider.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1700,
        currency: 'EUR',
        destinationAccountId: 'acct_artist',
      }),
    );

    // Manager payout
    expect(paymentProvider.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 300,
        currency: 'EUR',
        destinationAccountId: 'acct_manager',
      }),
    );

    // Booking completed
    expect(booking.changeStatus).toHaveBeenCalledWith(
      BookingStatus.COMPLETED,
    );

    // Payout recorded
    expect(payoutRepository.save).toHaveBeenCalledWith(
      expect.any(PayoutRecord),
    );
  });
});
