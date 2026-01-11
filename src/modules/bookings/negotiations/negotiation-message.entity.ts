// negotiation-message.entity.ts

export enum NegotiationSenderRole {
  ARTIST = 'ARTIST',
  MANAGER = 'MANAGER',
  VENUE = 'VENUE',
  PROMOTER = 'PROMOTER',
}

interface NegotiationMessageProps {
  id: string;
  bookingId: string;
  senderRole: NegotiationSenderRole;
  message?: string;
  proposedFee?: number;
  isFinalOffer: boolean;
  createdAt: Date;
}

export class NegotiationMessage {
    get message(): string | undefined {
      return this.props.message;
    }

    get createdAt(): Date {
      return this.props.createdAt;
    }
  private props: NegotiationMessageProps;

  constructor(props: NegotiationMessageProps) {
    this.props = props;
  }


  get id(): string {
    return this.props.id;
  }

  get isFinalOffer(): boolean {
    return this.props.isFinalOffer;
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get senderRole(): NegotiationSenderRole {
    return this.props.senderRole;
  }

  get proposedFee(): number | undefined {
    return this.props.proposedFee;
  }
}
