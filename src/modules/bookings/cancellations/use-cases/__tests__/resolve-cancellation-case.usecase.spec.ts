
import { SystemRole } from '../../../../../shared/system-role.enum'
import { CancellationResolutionType } from '../../domain/cancellation-resolution-type.enum'
import { ResolveCancellationCaseUseCase } from '../resolve-cancellation-case.usecase'
import { ConflictException, BadRequestException } from '@nestjs/common'

describe('ResolveCancellationCaseUseCase', () => {
  const cancellationCaseRepo = {
    findById: jest.fn(),
    markResolved: jest.fn(),
  }

  const resolutionRepo = {
    save: jest.fn(),
  }

  const useCase = new ResolveCancellationCaseUseCase(
    cancellationCaseRepo as any,
    resolutionRepo as any,
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('resolves cancellation with PARTIAL_REFUND', async () => {
    cancellationCaseRepo.findById.mockResolvedValue({
      id: 'case-1',
      status: 'OPEN',
    })

    await useCase.execute({
      cancellationCaseId: 'case-1',
      resolutionType: CancellationResolutionType.PARTIAL_REFUND,
      refundAmount: 100,
      resolvedByUserId: 'user-1',
      resolvedByRole: SystemRole.ARTIME,
    })

    expect(resolutionRepo.save).toHaveBeenCalled()
    expect(cancellationCaseRepo.markResolved).toHaveBeenCalledWith('case-1')
  })

  it('fails if case is not OPEN', async () => {
    cancellationCaseRepo.findById.mockResolvedValue({
      id: 'case-1',
      status: 'RESOLVED',
    })

    await expect(
      useCase.execute({
        cancellationCaseId: 'case-1',
        resolutionType: CancellationResolutionType.NO_REFUND,
        resolvedByUserId: 'user-1',
        resolvedByRole: SystemRole.ARTIME,
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('fails if PARTIAL_REFUND has no amount', async () => {
    cancellationCaseRepo.findById.mockResolvedValue({
      id: 'case-1',
      status: 'OPEN',
    })

    await expect(
      useCase.execute({
        cancellationCaseId: 'case-1',
        resolutionType: CancellationResolutionType.PARTIAL_REFUND,
        resolvedByUserId: 'user-1',
        resolvedByRole: SystemRole.ARTIME,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
