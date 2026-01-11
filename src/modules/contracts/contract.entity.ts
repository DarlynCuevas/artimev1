// contract.entity.ts

export enum ContractStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
}

interface ContractProps {
  id: string;
  bookingId: string;
  version: number;
  status: ContractStatus;
  createdAt: Date;
  signedAt?: Date;
}

export class Contract {
    get version(): number {
      return this.props.version;
    }

    get createdAt(): Date {
      return this.props.createdAt;
    }

    get signedAt(): Date | undefined {
      return this.props.signedAt;
    }
  private props: ContractProps;

  constructor(props: ContractProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get status(): ContractStatus {
    return this.props.status;
  }

  sign(): void {
    if (this.props.status === ContractStatus.SIGNED) {
      throw new Error('Contract is already signed');
    }

    this.props.status = ContractStatus.SIGNED;
    this.props.signedAt = new Date();
  }
}
