export enum PayoutStatus {
  PENDING = 'PENDING',
  READY_TO_PAY = 'READY_TO_PAY',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export class Payout {
  constructor(
    public readonly id: string,
    public readonly bookingId: string,
    public readonly artistId: string,
    public readonly managerId: string | null,

    public readonly grossAmount: number,
    public readonly artimeFeeAmount: number,
    public readonly managerFeeAmount: number,
    public readonly artistNetAmount: number,

    public readonly currency: string,
    public status: PayoutStatus,

    public readonly stripeTransferId?: string | null,
    public readonly createdAt?: Date,
    public readonly paidAt?: Date | null,
  ) {}
}
