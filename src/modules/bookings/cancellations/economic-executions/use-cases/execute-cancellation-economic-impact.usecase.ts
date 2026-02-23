import {
    Injectable,
    ForbiddenException,
    BadRequestException,
    NotFoundException,
    Inject,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { CancellationCaseRepository } from '../../repositories/cancellation-case.repository.interface';
import type { CancellationResolutionRepository } from '../../resolutions/repositories/cancellation-resolution.repository.interface';
import type { CancellationEconomicExecutionRepository } from '../repositories/cancellation-economic-execution.repository.interface';
import { CANCELLATION_CASE_REPOSITORY } from '../../repositories/cancellation-case.repository.token';
import { CANCELLATION_RESOLUTION_REPOSITORY } from '../../resolutions/repositories/cancellation-resolution.repository.token';
import { CANCELLATION_ECONOMIC_EXECUTION_REPOSITORY } from '../repositories/cancellation-economic-execution.repository.token';


import { CancellationEconomicExecution } from '../cancellation-economic-execution.entity';
import { StripePaymentProvider } from '@/src/infrastructure/payments/stripe-payment.provider';
import { CancellationStatus } from '../../enums/cancellation-status.enum';
import type { PaymentProvider } from '@/src/modules/payments/providers/payment-provider.interface';
import { DbPaymentRepository } from '@/src/infrastructure/database/repositories/payment.repository';
import { PAYMENT_REPOSITORY } from '@/src/modules/payments/repositories/payment.repository.token';
import { PAYMENT_PROVIDER } from '@/src/modules/payments/providers/payment-provider.token';
import { SystemRole } from '@/src/shared/system-role.enum';

@Injectable()
export class ExecuteCancellationEconomicImpactUseCase {
    constructor(
        @Inject(CANCELLATION_CASE_REPOSITORY)
        private readonly cancellationCaseRepository: CancellationCaseRepository,
        @Inject(CANCELLATION_RESOLUTION_REPOSITORY)
        private readonly cancellationResolutionRepository: CancellationResolutionRepository,
        @Inject(CANCELLATION_ECONOMIC_EXECUTION_REPOSITORY)
        private readonly cancellationEconomicExecutionRepository: CancellationEconomicExecutionRepository,
        @Inject(PAYMENT_REPOSITORY)
        private readonly paymentRepository: DbPaymentRepository,
        @Inject(PAYMENT_PROVIDER)
        private readonly paymentProvider: PaymentProvider,
    ) { }

    async execute(params: {
        cancellationCaseId: string;
        executedByUserId: string;
        executedByRole: 'ARTIME';
    }): Promise<void> {
        const { cancellationCaseId, executedByUserId, executedByRole } = params;

        if (executedByRole !== 'ARTIME') {
            throw new ForbiddenException('ONLY_ARTIME_CAN_EXECUTE_ECONOMIC_IMPACT');
        }

        const cancellationCase =
            await this.cancellationCaseRepository.findById(cancellationCaseId);

        if (!cancellationCase) {
            throw new NotFoundException('CANCELLATION_CASE_NOT_FOUND');
        }

        if (cancellationCase.status !== CancellationStatus.RESOLVED) {
            throw new BadRequestException('CANCELLATION_CASE_NOT_RESOLVED');
        }

        const existingExecution =
            await this.cancellationEconomicExecutionRepository.findByCancellationCaseId(
                cancellationCaseId,
            );

        if (existingExecution) {
            throw new BadRequestException('ECONOMIC_IMPACT_ALREADY_EXECUTED');
        }

        const resolution =
            await this.cancellationResolutionRepository.findByCancellationCaseId(
                cancellationCaseId,
            );

        if (!resolution) {
            throw new NotFoundException('CANCELLATION_RESOLUTION_NOT_FOUND');
        }

        // 1️ Obtener el pago principal del booking
        const payment = await this.paymentRepository.findMainPaymentByBookingId(
            cancellationCase.bookingId,
        );

        if (!payment) {
            throw new NotFoundException('PAYMENT_NOT_FOUND_FOR_BOOKING');
        }

        let stripeRefundId: string | undefined;

        // 2️ Ejecutar refund según resolución
        if (resolution.resolutionType === 'FULL_REFUND') {
            await this.paymentProvider.refundPayment({
                providerPaymentId: payment.providerPaymentId,
            });

            stripeRefundId = payment.providerPaymentId;
        }

        if (resolution.resolutionType === 'PARTIAL_REFUND') {
            await this.paymentProvider.refundPayment({
                providerPaymentId: payment.providerPaymentId,
                amount: resolution.refundAmount!,
            });

            stripeRefundId = payment.providerPaymentId;
        }

        // NO_REFUND → no se hace nada económico
        if (!stripeRefundId) {
            throw new Error('stripeRefundId is required to execute economic impact');
        }
        // 3️ Registrar ejecución económica
        const execution: CancellationEconomicExecution = {
            id: randomUUID(),
            cancellationCaseId,
            resolutionType: 'REFUND',
            executedByUserId,
            executedByRole: SystemRole.ARTIME,
            stripeRefundId,
            executedAt: new Date(),
        };


        await this.cancellationEconomicExecutionRepository.save(execution);
    }
}
