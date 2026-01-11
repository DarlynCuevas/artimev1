// payment-milestone.entity.ts

import { PaymentMilestoneStatus } from './payment-milestone-status.enum';
export enum PaymentMilestoneType {
  ADVANCE = 'ADVANCE',
  FINAL = 'FINAL',
  // Added new status enum
}

interface PaymentMilestoneProps {
  id: string;
  type: PaymentMilestoneType;
  amount: number;
  status: PaymentMilestoneStatus;
  dueDate?: Date;
  paidAt?: Date;
  resolvedAt?: Date;
  providerPaymentId?: string;
}

export class PaymentMilestone {
        get providerPaymentId(): string | undefined {
          return this.props.providerPaymentId;
        }
      get paidAt(): Date | undefined {
        return this.props.paidAt;
      }
    get id(): string {
      return this.props.id;
    }

    get dueDate(): Date | undefined {
      return this.props.dueDate;
    }
    get status(): PaymentMilestoneStatus {
      return this.props.status;
    }
  private props: PaymentMilestoneProps;

  constructor(props: PaymentMilestoneProps) {
    this.props = props;
  }

  get type(): PaymentMilestoneType {
    return this.props.type;
  }

  get amount(): number {
    return this.props.amount;
  }

  isPaid(): boolean {
    return Boolean(this.props.paidAt);
  }

  markAsPaid(date?: Date): void {
    if (this.isPaid()) {
      throw new Error('Payment milestone already paid');
    }
    this.props.paidAt = date ?? new Date();
  }
  
  markAsRefunded(refundedAt: Date): void {
    if (this.props.status !== PaymentMilestoneStatus.PAID) {
      throw new Error('Only paid milestones can be refunded');
    }
    this.props.status = PaymentMilestoneStatus.REFUNDED;
    this.props.resolvedAt = refundedAt;
  }
  
  finalize(finalizedAt: Date): void {
    if (this.props.status !== PaymentMilestoneStatus.PAID) {
      throw new Error('Only paid milestones can be finalized');
    }
    this.props.status = PaymentMilestoneStatus.FINALIZED;
    this.props.resolvedAt = finalizedAt;
  }
}
