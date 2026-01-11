import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';

export const stripe = new Stripe(
  apiKey,
  {
    apiVersion: '2025-12-15.clover',
  },
);
