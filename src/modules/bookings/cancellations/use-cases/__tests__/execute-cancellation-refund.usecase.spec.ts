import { ExecuteCancellationRefundUseCase } from '../../../../payments/use-cases/cancellation-refund/execute-cancellation-refund.usecase'
import { SystemRole } from '../../../../../shared/system-role.enum'
import { ConflictException } from '@nestjs/common'

describe('ExecuteCancellationRefundUseCase', () => {
  const stripeProvider = {
    refundPaymentIntent: jest.fn(),
  }

  const executionRepo = {
    findByCancellationCaseId: jest.fn(),
    save: jest.fn(),
  }

  const useCase = new ExecuteCancellationRefundUseCase(
    stripeProvider as any,
    executionRepo as any,
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('executes refund successfully', async () => {
    executionRepo.findByCancellationCaseId.mockResolvedValue(null)
    stripeProvider.refundPaymentIntent.mockResolvedValue({ id: 're_123' })

    await useCase.execute({
      cancellationCaseId: 'case-1',
      paymentIntentId: 'pi_123',
      refundAmount: 100,
      executedByUserId: 'user-1',
      executedByRole: SystemRole.ARTIME,
    })

    expect(stripeProvider.refundPaymentIntent).toHaveBeenCalled()
    expect(executionRepo.save).toHaveBeenCalled()
  })

  it('fails if refund already executed', async () => {
    executionRepo.findByCancellationCaseId.mockResolvedValue({ id: 'exec-1' })

    await expect(
      useCase.execute({
        cancellationCaseId: 'case-1',
        paymentIntentId: 'pi_123',
        refundAmount: 100,
        executedByUserId: 'user-1',
        executedByRole: SystemRole.ARTIME,
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })
})
