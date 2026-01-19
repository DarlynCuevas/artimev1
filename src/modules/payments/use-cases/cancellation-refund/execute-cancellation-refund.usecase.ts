import { StripePaymentProvider } from "@/src/infrastructure/payments/stripe-payment.provider"
import { CancellationEconomicExecution } from "@/src/modules/bookings/cancellations/economic-executions/cancellation-economic-execution.entity"
import { Inject, Injectable } from "@nestjs/common";
import { CANCELLATION_ECONOMIC_EXECUTION_REPOSITORY } from "@/src/modules/bookings/cancellations/economic-executions/repositories/cancellation-economic-execution.repository.token";
import type { CancellationEconomicExecutionRepository } from "@/src/modules/bookings/cancellations/economic-executions/repositories/cancellation-economic-execution.repository.interface";
import { SystemRole } from "@/src/shared/system-role.enum"

@Injectable()
export class ExecuteCancellationRefundUseCase {
  constructor(
    private readonly stripeProvider: StripePaymentProvider,
    @Inject(CANCELLATION_ECONOMIC_EXECUTION_REPOSITORY)
    private readonly executionRepo: CancellationEconomicExecutionRepository,
  ) {}

  async execute(params: {
    cancellationCaseId: string
    paymentIntentId: string
    refundAmount: number
    executedByUserId: string
    executedByRole: SystemRole
  }) {
    // 1. Ejecutar refund en Stripe
    const refund = await this.stripeProvider.refundPaymentIntent({
      paymentIntentId: params.paymentIntentId,
      amount: params.refundAmount,
    })

    // 2. Construir la entidad
const execution = new CancellationEconomicExecution({
  id: crypto.randomUUID(),
  cancellationCaseId: params.cancellationCaseId,
  resolutionType: 'REFUND',
  stripeRefundId: refund.id,
  executedByUserId: params.executedByUserId,
  executedByRole: params.executedByRole as SystemRole,
  executedAt: new Date(),
})

await this.executionRepo.save(execution)
  }
}
