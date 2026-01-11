export interface PayoutRecordProps {
  bookingId: string;

  artistAmount: number;
  managerAmount?: number;
  artimeAmount: number;

  currency: string;

  executedAt: Date;
}

export class PayoutRecord {
  private readonly props: PayoutRecordProps;

  constructor(props: PayoutRecordProps) {
    this.props = props;
  }

  get bookingId() {
    return this.props.bookingId;
  }

  get artistAmount() {
    return this.props.artistAmount;
  }

  get managerAmount() {
    return this.props.managerAmount ?? 0;
  }

  get artimeAmount() {
    return this.props.artimeAmount;
  }

  get currency() {
    return this.props.currency;
  }

  get executedAt() {
    return this.props.executedAt;
  }
}
