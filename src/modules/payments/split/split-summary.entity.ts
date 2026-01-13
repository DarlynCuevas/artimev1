export interface SplitSummaryProps {
  bookingId: string;
  artistFee: number;
  artimeCommission: number;
  managerInvolved: boolean;
  managerCommission?: number;
   grossAmount: number; 
  paymentCosts: number;
  artistNetAmount: number;
  totalPayable: number;
  currency: string;
  frozenAt: Date;
}

export class SplitSummary {
  private props: SplitSummaryProps;

  constructor(props: SplitSummaryProps) {
    this.props = props;
  }

  get bookingId() {
    return this.props.bookingId;
  }

  get artistFee() {
    return this.props.artistFee;
  }

  get artimeCommission() {
    return this.props.artimeCommission;
  }

  get managerInvolved() {
    return this.props.managerInvolved;
  }

  get managerCommission() {
    return this.props.managerCommission ?? 0;
  }

  get paymentCosts() {
    return this.props.paymentCosts;
  }

  get artistNetAmount() {
    return this.props.artistNetAmount;
  }

  get totalPayable() {
    return this.props.totalPayable;
  }

  get currency() {
    return this.props.currency;
  }

  get frozenAt() {
    return this.props.frozenAt;
  }

  get grossAmount() {
    return this.props.grossAmount;
  }
}
