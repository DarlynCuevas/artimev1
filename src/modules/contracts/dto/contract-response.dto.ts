export class ContractResponseDto {
  id: string;
  bookingId: string;
  version: number;
  status: string;
  currency: string;
  totalAmount: number;
  artimeCommissionPercentage: number;
  finalOfferId?: string | null;
  signedAt?: Date;
  signedByRole?: string | null;
  snapshotData: any;
  createdAt: Date;
}
