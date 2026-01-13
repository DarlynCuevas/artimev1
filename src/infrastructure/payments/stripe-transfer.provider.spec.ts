const mockCreateTransfer = jest.fn();

jest.mock('./stripe.client', () => ({
  stripe: {
    transfers: {
      create: mockCreateTransfer,
    },
  },
}));

import { StripeTransferProvider } from './stripe-transfer.provider';

describe('StripeTransferProvider', () => {
  let provider: StripeTransferProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new StripeTransferProvider();
  });

//TEST 1 — Transfer a artista (happy path)
    it('creates a Stripe transfer for artist', async () => {
    mockCreateTransfer.mockResolvedValue({});

    await provider.transferToArtist({
      artistStripeAccountId: 'acct_artist_123',
      amountCents: 10000,
      currency: 'EUR',
      bookingId: 'booking-1',
    });

    expect(mockCreateTransfer).toHaveBeenCalledWith({
      amount: 10000,
      currency: 'EUR',
      destination: 'acct_artist_123',
      metadata: {
        bookingId: 'booking-1',
        role: 'artist',
      },
    });
  });

//TEST 2 — Artista sin Stripe Account
    it('throws error if artist has no Stripe account', async () => {
    await expect(
      provider.transferToArtist({
        artistStripeAccountId: null,
        amountCents: 10000,
        currency: 'EUR',
        bookingId: 'booking-1',
      }),
    ).rejects.toThrow('Artist has no connected Stripe account');

    expect(mockCreateTransfer).not.toHaveBeenCalled();
  });

//TEST 3 — Transfer a manager (happy path)
    it('creates a Stripe transfer for manager', async () => {
    mockCreateTransfer.mockResolvedValue({});

    await provider.transferToManager({
      managerStripeAccountId: 'acct_manager_456',
      amountCents: 3000,
      currency: 'EUR',
      bookingId: 'booking-1',
    });

    expect(mockCreateTransfer).toHaveBeenCalledWith({
      amount: 3000,
      currency: 'EUR',
      destination: 'acct_manager_456',
      metadata: {
        bookingId: 'booking-1',
        role: 'manager',
      },
    });
  });

  //TEST 4 — Manager sin Stripe Account
    it('throws error if manager has no Stripe account', async () => {
    await expect(
      provider.transferToManager({
        managerStripeAccountId: null,
        amountCents: 3000,
        currency: 'EUR',
        bookingId: 'booking-1',
      }),
    ).rejects.toThrow('Manager has no connected Stripe account');

    expect(mockCreateTransfer).not.toHaveBeenCalled();
  });

//TEST 5 — Stripe falla (propaga error)
    it('propagates Stripe error without handling it', async () => {
    mockCreateTransfer.mockRejectedValue(
      new Error('Stripe API error'),
    );

    await expect(
      provider.transferToArtist({
        artistStripeAccountId: 'acct_artist_123',
        amountCents: 10000,
        currency: 'EUR',
        bookingId: 'booking-1',
      }),
    ).rejects.toThrow('Stripe API error');
  });
});
