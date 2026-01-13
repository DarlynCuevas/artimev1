import { SplitSummary } from './split-summary.entity';

interface SplitCalculatorInput {
  bookingId: string;
  artistFee: number;
  artimeCommissionPercentage: number;
  managerInvolved: boolean;
  grossAmount: number;
  managerCommissionPercentage?: number;
  paymentCosts: number;
  currency: string;
}

// --- NUEVO para payouts ---
export interface PayoutSplitInput {
  bookingId: string;
  totalAmount: number;
  artimeCommissionPercentage: number;
  managerId?: string;
  managerCommissionPercentage?: number;
  currency: string;
}

export interface PayoutSplitResult {
  grossAmount: number;
  artimeFee: number;
  managerFee: number;
  artistNet: number;
}

export class SplitCalculator {
  // Split específico para payouts
  calculateForPayout(input: PayoutSplitInput): PayoutSplitResult {
    const grossAmount = input.totalAmount;

    if (grossAmount <= 0) {
      throw new Error('Invalid booking total amount');
    }

    const artimeFee = Math.round(
      grossAmount * input.artimeCommissionPercentage
    );

    const artistBase = grossAmount - artimeFee;

    let managerFee = 0;
    if (input.managerId && input.managerCommissionPercentage) {
      managerFee = Math.round(
        artistBase * input.managerCommissionPercentage
      );
    }

    const artistNet = artistBase - managerFee;

    return {
      grossAmount,
      artimeFee,
      managerFee,
      artistNet,
    };
  }

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
      grossAmount: input.grossAmount, // ✅ CLAVE
      totalPayable,
      currency: input.currency,
      frozenAt: new Date(),
    });
  }
}
