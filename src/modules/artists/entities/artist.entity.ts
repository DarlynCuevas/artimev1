import { StripeOnboardingStatus } from '../../payments/stripe/stripe-onboarding-status.enum';
import { ArtistFormat } from '../enums/artist-format.enum';

export interface ArtistProps {
  id: string;
  email: string;
  stripeOnboardingStatus: StripeOnboardingStatus;
  name: string;
  city: string;
  genres: string[];
  basePrice: number;
  currency: string;
  isNegotiable: boolean;
  bio: string;
  format: ArtistFormat;
  stripeAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
  rating?: number;
  managerId: string | null;
}

export class Artist {
  private props: ArtistProps;

  constructor(props: ArtistProps) {
    this.props = props;
  }

  get id() {
    return this.props.id;
  }

  get email() {
    return this.props.email;
  }

  get stripeAccountId() {
    return this.props.stripeAccountId;
  }


  get stripeOnboardingStatus() {
    return this.props.stripeOnboardingStatus;
  }

  get name() {
    return this.props.name;
  }

  get city() {
    return this.props.city;
  }

  get genres() {
    return this.props.genres;
  }

  get basePrice() {
    return this.props.basePrice;
  }

  get currency() {
    return this.props.currency;
  }

  get isNegotiable() {
    return this.props.isNegotiable;
  }

  get bio() {
    return this.props.bio;
  }

  get format() {
    return this.props.format;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  get rating() {
    return this.props.rating;
  }

  get managerId() {
    return this.props.managerId;
  }

  setStripeAccount(input: {
    stripeAccountId: string;
    onboardingStatus: StripeOnboardingStatus;
  }) {
    this.props.stripeAccountId = input.stripeAccountId;
    this.props.stripeOnboardingStatus = input.onboardingStatus;
  }
}
