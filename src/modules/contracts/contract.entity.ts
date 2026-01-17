import { ContractStatus } from "./enum/contractStatus.enum";

export class Contract {
  readonly id: string;
  readonly bookingId: string;
  readonly version: number;
  status: ContractStatus;
  readonly currency: string;
  readonly totalAmount: number;
  readonly artimeCommissionPercentage: number;
  readonly finalOfferId: string | null;
  signedAt?: Date;
  signedByRole?: string;
  readonly snapshotData: any;
  readonly createdAt: Date;

  constructor(props: {
    id: string;
    bookingId: string;
    version: number;
    status: ContractStatus;
    currency: string;
    totalAmount: number;
    artimeCommissionPercentage: number;
    finalOfferId?: string | null;
    signedAt?: Date | null;
    signedByRole?: string | null;
    snapshotData: any;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.bookingId = props.bookingId;
    this.version = props.version;
    this.status = props.status;
    this.currency = props.currency;
    this.totalAmount = props.totalAmount;
    this.artimeCommissionPercentage = props.artimeCommissionPercentage;
    this.finalOfferId = props.finalOfferId ?? null;
    this.signedAt = props.signedAt === null ? undefined : props.signedAt;
    this.signedByRole =
      props.signedByRole === null ? undefined : props.signedByRole;
    this.snapshotData = props.snapshotData;
    this.createdAt = props.createdAt;
  }

  sign(input: {
    signedByUserId: string; // no se persiste, solo informativo
    signedAt: Date;
  }) {
    this.status = ContractStatus.SIGNED;
    this.signedAt = input.signedAt;
  }

  // --------
  // MAPPER
  // --------
  static fromPersistence(row: any): Contract {
    return new Contract({
      id: row.id,
      bookingId: row.booking_id,
      version: row.version,
      status: row.status as ContractStatus,
      currency: row.currency,
      totalAmount: Number(row.total_amount),
      artimeCommissionPercentage: Number(row.artime_commission_percentage),
      finalOfferId: row.final_offer_id ?? null,
      signedAt: row.signed_at ? new Date(row.signed_at) : null,
      signedByRole: row.signed_by_role ?? null,
      snapshotData: row.snapshot_data,
      createdAt: new Date(row.created_at),
    });
  }
}
