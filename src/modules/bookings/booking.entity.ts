


import { BookingStatus } from './booking-status.enum';
import { BookingStateMachine } from './booking-state-machine';

interface BookingProps {
  id: string;
  artistId: string;
  venueId?: string;
  promoterId: string | null;
  status: BookingStatus;
  createdAt: Date;
  currency: string;
  managerId?: string;
  managerCommissionPercentage?: number;
  totalAmount: number;
  eventId?: string | null;
  artistStripeAccountId?: string | null;
  managerStripeAccountId?: string | null;
  artimeCommissionPercentage?: number;
}
 
 
export class Booking {
    get artistStripeAccountId(): string | null | undefined {
      return this.props.artistStripeAccountId;
    }

    get managerStripeAccountId(): string | null | undefined {
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
  get promoterId(): string | null |undefined{
    return this.props.promoterId;;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

   get currency(): string {
    return this.props.currency;
  }

  get artimeCommissionPercentage(): number | undefined {
    return this.props.artimeCommissionPercentage;
  }

  get managerId(): string | undefined {
    return this.props.managerId;
  }

  get managerCommissionPercentage(): number | undefined {
    return this.props.managerCommissionPercentage;
  }

    get totalAmount(): number {
    return this.props.totalAmount;
  }

   // 👇 NUEVO Getter (opcional)
  get eventId(): string | null | undefined {
    return this.props.eventId;
  }


  //  Comportamiento de dominio
  changeStatus(nextStatus: BookingStatus): void {
    const newStatus = BookingStateMachine.transition(
      this.props.status,
      nextStatus,
    );
    this.props.status = newStatus;
  }

  markAsPaidPartial(): void {
    this.changeStatus(BookingStatus.PAID_PARTIAL);
  }

  markAsPaidFull(): void {
    this.changeStatus(BookingStatus.PAID_FULL);
  }
}
