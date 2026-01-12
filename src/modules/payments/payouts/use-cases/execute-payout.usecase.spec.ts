import { ExecutePayoutUseCase } from './execute-payout.usecase';
//Setup base del test
describe('ExecutePayoutUseCase', () => {
  let useCase: ExecutePayoutUseCase;

  const payoutRepository = {
    findById: jest.fn(),
    lockById: jest.fn(),
    markAsPaid: jest.fn(),
    markAsFailed: jest.fn(),
  };

  const bookingRepository = {
    findById: jest.fn(),
  };

  const retainedFundsService = {
    hasSufficientFunds: jest.fn(),
  };

  const transferProvider = {
    transferToArtist: jest.fn(),
    transferToManager: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new ExecutePayoutUseCase(
      payoutRepository as any,
      bookingRepository as any,
      retainedFundsService as any,
      transferProvider as any,
    );
  });
    // TEST 1 — Happy path
      it('executes payout successfully (happy path)', async () => {
    payoutRepository.findById.mockResolvedValue({
      id: 'payout-1',
      status: 'READY_TO_PAY',
      bookingId: 'booking-1',
      artistId: 'artist-1',
      managerId: 'manager-1',
      grossAmountCents: 10000,
      artistAmountCents: 7000,
      managerAmountCents: 2000,
      artimeFeeCents: 1000,
      currency: 'EUR',
    });

    bookingRepository.findById.mockResolvedValue({
      id: 'booking-1',
      status: 'COMPLETED',
    });

    retainedFundsService.hasSufficientFunds.mockResolvedValue(true);

    transferProvider.transferToArtist.mockResolvedValue(undefined);
    transferProvider.transferToManager.mockResolvedValue(undefined);

    await useCase.execute('payout-1', 'SYSTEM');

    expect(payoutRepository.lockById).toHaveBeenCalledWith('payout-1');
    expect(transferProvider.transferToArtist).toHaveBeenCalled();
    expect(transferProvider.transferToManager).toHaveBeenCalled();
    expect(payoutRepository.markAsPaid).toHaveBeenCalled();
    expect(payoutRepository.markAsFailed).not.toHaveBeenCalled();
  });

  //TEST 2 — Idempotencia (PAID)
  it('does nothing if payout is already PAID', async () => {
    payoutRepository.findById.mockResolvedValue({
      id: 'payout-1',
      status: 'PAID',
    });

    await useCase.execute('payout-1', 'SYSTEM');

    expect(transferProvider.transferToArtist).not.toHaveBeenCalled();
    expect(payoutRepository.markAsPaid).not.toHaveBeenCalled();
    expect(payoutRepository.markAsFailed).not.toHaveBeenCalled();
  });

  //TEST 3 — Estado inválido
  it('throws error if payout is not READY_TO_PAY', async () => {
    payoutRepository.findById.mockResolvedValue({
      id: 'payout-1',
      status: 'PENDING',
    });

    await expect(
      useCase.execute('payout-1', 'SYSTEM'),
    ).rejects.toThrow();

    expect(transferProvider.transferToArtist).not.toHaveBeenCalled();
    expect(payoutRepository.markAsPaid).not.toHaveBeenCalled();
  });

  //TEST 4 — Fondos insuficientes
  it('throws error if retained funds are insufficient', async () => {
    payoutRepository.findById.mockResolvedValue({
      id: 'payout-1',
      status: 'READY_TO_PAY',
      bookingId: 'booking-1',
      grossAmountCents: 10000,
      artistAmountCents: 7000,
      managerAmountCents: 2000,
      artimeFeeCents: 1000,
    });

    bookingRepository.findById.mockResolvedValue({
      id: 'booking-1',
      status: 'COMPLETED',
    });

    retainedFundsService.hasSufficientFunds.mockResolvedValue(false);

    await expect(
      useCase.execute('payout-1', 'SYSTEM'),
    ).rejects.toThrow();

    expect(transferProvider.transferToArtist).not.toHaveBeenCalled();
    expect(payoutRepository.markAsPaid).not.toHaveBeenCalled();
  });

  //TEST 5 — Fallo de Stripe
  it('marks payout as FAILED if transfer fails', async () => {
    payoutRepository.findById.mockResolvedValue({
      id: 'payout-1',
      status: 'READY_TO_PAY',
      bookingId: 'booking-1',
      artistId: 'artist-1',
      grossAmountCents: 10000,
      artistAmountCents: 9000,
      managerAmountCents: 0,
      artimeFeeCents: 1000,
      currency: 'EUR',
    });

    bookingRepository.findById.mockResolvedValue({
      id: 'booking-1',
      status: 'COMPLETED',
    });

    retainedFundsService.hasSufficientFunds.mockResolvedValue(true);

    transferProvider.transferToArtist.mockRejectedValue(
      new Error('Stripe error'),
    );

    await expect(
      useCase.execute('payout-1', 'SYSTEM'),
    ).rejects.toThrow('Stripe error');

    expect(payoutRepository.markAsFailed).toHaveBeenCalled();
    expect(payoutRepository.markAsPaid).not.toHaveBeenCalled();
  });
});
