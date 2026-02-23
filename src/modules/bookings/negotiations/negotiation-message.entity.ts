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
  senderUserId: string;
  message?: string;
  proposedFee?: number;
  allIn?: boolean;
  isFinalOffer: boolean;
  createdAt: Date;
}

export class NegotiationMessage {
  private props: NegotiationMessageProps;

  constructor(props: NegotiationMessageProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get senderRole(): NegotiationSenderRole {
    return this.props.senderRole;
  }

  get senderUserId(): string {
    return this.props.senderUserId;
  }

  get message(): string | undefined {
    return this.props.message;
  }

  get proposedFee(): number | undefined {
    return this.props.proposedFee;
  }

  get allIn(): boolean {
    return Boolean(this.props.allIn);
  }

  get isFinalOffer(): boolean {
    return this.props.isFinalOffer;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
