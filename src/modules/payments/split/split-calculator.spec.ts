import { SplitCalculator } from './split-calculator.service';

describe('SplitCalculator', () => {
  it('calculates split with manager involved', () => {
    const calculator = new SplitCalculator();

    const split = calculator.calculate({
      bookingId: 'booking-1',
      artistFee: 2000,
      artimeCommissionPercentage: 0.1,
      managerInvolved: true,
      managerCommissionPercentage: 0.15,
      paymentCosts: 15,
      currency: 'EUR',
    });

    expect(split.artistNetAmount).toBe(1700);
    expect(split.artimeCommission).toBe(200);
    expect(split.managerCommission).toBe(300);
    expect(split.totalPayable).toBe(2215);
    expect(split.currency).toBe('EUR');
  });

  it('calculates split without manager involved', () => {
    const calculator = new SplitCalculator();

    const split = calculator.calculate({
      bookingId: 'booking-2',
      artistFee: 2000,
      artimeCommissionPercentage: 0.1,
      managerInvolved: false,
      paymentCosts: 15,
      currency: 'EUR',
    });

    expect(split.artistNetAmount).toBe(2000);
    expect(split.managerCommission).toBe(0);
    expect(split.artimeCommission).toBe(200);
    expect(split.totalPayable).toBe(2215);
  });
});
