


import { BookingStatus } from './booking-status.enum';
import { BookingStateMachine } from './booking-state-machine';
import { NegotiationSenderRole } from './negotiations/negotiation-message.entity';
import { BookingHandlerRole } from './domain/booking-handler.mapper';

interface BookingProps {
  id: string;
  artistId: string;
  artistName?: string | null;
  artistCity?: string | null;
  venueId?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
  promoterId: string | null;
  status: BookingStatus;
  createdAt: Date;
  currency: string;
  managerId?: string;
  managerCommissionPercentage?: number;
  totalAmount: number;
  allIn?: boolean;
  eventId?: string | null;
  eventName?: string | null;
  artistStripeAccountId?: string | null;
  managerStripeAccountId?: string | null;
  artimeCommissionPercentage?: number;
  start_date: string;
  message?: string;
  handledByRole: BookingHandlerRole | null;
  handledByUserId: string | null;
  handledAt: Date | null;
  updatedAt?: Date | null;
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

  get start_date(): string {
    return this.props.start_date;
  }

  //  Getters (lectura segura)
  get id(): string {
    return this.props.id;
  }

  get status(): BookingStatus {
    return this.props.status;
  }
  set status(value: BookingStatus) {
    this.props.status = value;
  }
  get artistId(): string {
    return this.props.artistId;
  }

  get artistName(): string | null | undefined {
    return this.props.artistName;
  }

  get artistCity(): string | null | undefined {
    return this.props.artistCity;
  }
  get venueId(): string | null | undefined {
    return this.props.venueId;
  }

  get venueName(): string | null | undefined {
    return this.props.venueName;
  }

  get venueCity(): string | null | undefined {
    return this.props.venueCity;
  }
  get promoterId(): string | null | undefined {
    return this.props.promoterId;
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

  updateTotalAmount(amount: number): void {
    this.props.totalAmount = amount;
    this.props.updatedAt = new Date();
  }

  get allIn(): boolean {
    return Boolean(this.props.allIn);
  }

  updateAllIn(value: boolean): void {
    this.props.allIn = value;
    this.props.updatedAt = new Date();
  }

  get handledByRole(): BookingHandlerRole | null {
    return this.props.handledByRole;
  }

  get handledByUserId(): string | null {
    return this.props.handledByUserId;
  }

  get handledAt(): Date | null {
    return this.props.handledAt;
  }

  get updatedAt(): Date | null | undefined {
    return this.props.updatedAt;
  }

  get eventId(): string | null | undefined {
    return this.props.eventId;
  }

  get eventName(): string | null | undefined {
    return this.props.eventName;
  }

  get message(): string | undefined {
    return this.props.message;
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

  assignHandler(params: {
    role: BookingHandlerRole
    userId: string;
    at?: Date;
  }): Booking {
    return new Booking({
      ...this.toPrimitives(),

      handledByRole: params.role,
      handledByUserId: params.userId,
      handledAt: params.at ?? new Date(),
    });
  }

  toPrimitives(): BookingProps {
    return {
      id: this.id,
      artistId: this.artistId,
      artistName: this.artistName ?? null,
      artistCity: this.artistCity ?? null,
      venueId: this.venueId,
      venueName: this.venueName ?? null,
      venueCity: this.venueCity ?? null,
      promoterId: this.promoterId ?? null,
      eventId: this.eventId ?? null,
      eventName: this.eventName ?? null,
      status: this.status,
      currency: this.currency,
      totalAmount: this.totalAmount,
      start_date: this.start_date,
      artistStripeAccountId: this.artistStripeAccountId,
      managerStripeAccountId: this.managerStripeAccountId,
      artimeCommissionPercentage: this.artimeCommissionPercentage,
      managerCommissionPercentage: this.managerCommissionPercentage,
      managerId: this.managerId,
      createdAt: this.createdAt,
      handledByRole: this.handledByRole,
      handledByUserId: this.handledByUserId,
      handledAt: this.handledAt,
      updatedAt: this.updatedAt ?? null,
      message: this.props.message,
    };
  }


}
