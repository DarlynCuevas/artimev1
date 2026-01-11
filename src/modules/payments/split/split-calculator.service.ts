import { SplitSummary } from './split-summary.entity';

interface SplitCalculatorInput {
  bookingId: string;
  artistFee: number;
  artimeCommissionPercentage: number;
  managerInvolved: boolean;
  managerCommissionPercentage?: number;
  paymentCosts: number;
  currency: string;
}

export class SplitCalculator {
  calculate(input: SplitCalculatorInput): SplitSummary {
    const artimeCommission =
      input.artistFee * input.artimeCommissionPercentage;

    const managerCommission =
      input.managerInvolved && input.managerCommissionPercentage
        ? input.artistFee * input.managerCommissionPercentage
        : 0;

    const artistNetAmount =
      input.artistFee - managerCommission;

    const totalPayable =
      input.artistFee + artimeCommission + input.paymentCosts;

    return new SplitSummary({
      bookingId: input.bookingId,
      artistFee: input.artistFee,
      artimeCommission,
      managerInvolved: input.managerInvolved,
      managerCommission,
      paymentCosts: input.paymentCosts,
      artistNetAmount,
      totalPayable,
      currency: input.currency,
      frozenAt: new Date(),
    });
  }
}
