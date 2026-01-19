// payment-schedule.entity.ts

import { PaymentMilestone } from "./payment-milestone.entity";



interface PaymentScheduleProps {
  id: string;
  bookingId: string;
  totalAmount: number;
  currency: string;
  milestones: PaymentMilestone[];
  createdAt: Date;
}

export class PaymentSchedule {
    get totalAmount(): number {
      return this.props.totalAmount;
    }

    get currency(): string {
      return this.props.currency;
    }
  private props: PaymentScheduleProps;

  constructor(props: PaymentScheduleProps) {
    this.props = props;
  }
    get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get id(): string {
    return this.props.id;
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get milestones(): PaymentMilestone[] {
    return this.props.milestones;
  }

  isFullyPaid(): boolean {
    return this.props.milestones.every(
      (milestone) => milestone.isPaid(),
    );
  }
}
