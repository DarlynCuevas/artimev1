import { StripeOnboardingStatus } from '../../payments/stripe/stripe-onboarding-status.enum';

export interface ArtistProps {
  id: string;
  email: string;
  stripeAccountId?: string;
  stripeOnboardingStatus: StripeOnboardingStatus;
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

  setStripeAccount(input: {
    stripeAccountId: string;
    onboardingStatus: StripeOnboardingStatus;
  }) {
    this.props.stripeAccountId = input.stripeAccountId;
    this.props.stripeOnboardingStatus = input.onboardingStatus;
  }
}
