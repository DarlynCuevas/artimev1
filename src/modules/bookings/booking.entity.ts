// booking.entity.ts

import { BookingStatus } from './booking-status.enum';
import { BookingStateMachine } from './booking-state-machine';

interface BookingProps {
  id: string;
  artistId: string;
  venueId?: string;
  promoterId?: string;
  status: BookingStatus;
  createdAt: Date;
  artistStripeAccountId: string;
  managerStripeAccountId?: string;
  currency: string;
}
 
export class Booking {
    get artistStripeAccountId(): string {
      return this.props.artistStripeAccountId;
    }

    get managerStripeAccountId(): string | undefined {
      return this.props.managerStripeAccountId;
    }
  private props: BookingProps;

  constructor(props: BookingProps) {
    this.props = props;
  }

  //  Getters (lectura segura)
  get id(): string {
    return this.props.id;
  }

  get status(): BookingStatus {
    return this.props.status;
  }
  get artistId(): string {
    return this.props.artistId;
  }
  get venueId(): string | undefined {
    return this.props.venueId;
  }
  get promoterId(): string | undefined {
    return this.props.promoterId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

   get currency(): string {
    return this.props.currency;
  }


  //  Comportamiento de dominio
  changeStatus(nextStatus: BookingStatus): void {
    const newStatus = BookingStateMachine.transition(
      this.props.status,
      nextStatus,
    );

    this.props.status = newStatus;
  }
}
