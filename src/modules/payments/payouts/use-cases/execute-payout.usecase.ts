// api/src/modules/payments/payouts/use-cases/execute-payout.usecase.ts

import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class ExecutePayoutUseCase {
    constructor(
        @Inject('PAYOUT_REPOSITORY')
        private readonly payoutRepository: any,

        @Inject('BOOKING_REPOSITORY')
        private readonly bookingRepository: any,

        @Inject('RETAINED_FUNDS_SERVICE')
        private readonly retainedFundsService: any,

        @Inject('TRANSFER_PROVIDER')
        private readonly transferProvider: any,
    ) { }

    async execute(payoutId: string, executedBy: 'SYSTEM' | 'ADMIN'): Promise<void> {
        // 1. Cargar payout
        const payout = await this.payoutRepository.findById(payoutId);

        if (!payout) {
            throw new Error(`Payout ${payoutId} not found`);
        }

        // 2. Idempotencia básica
        if (payout.status === 'PAID') {
            // Ya pagado → salida silenciosa
            return;
        }

        if (payout.status !== 'READY_TO_PAY') {
            throw new Error(
                `Payout ${payoutId} is not executable (status=${payout.status})`,
            );
        }

        // 3. Verificar booking asociado
        const booking = await this.bookingRepository.findById(payout.bookingId);

        if (!booking) {
            throw new Error(`Booking ${payout.bookingId} not found`);
        }

        if (booking.status !== 'COMPLETED') {
            throw new Error(
                `Booking ${booking.id} is not completed (status=${booking.status})`,
            );
        }

        // 4. Verificar fondos retenidos
        const hasFunds = await this.retainedFundsService.hasSufficientFunds(
            booking.id,
            payout.grossAmountCents,
        );

        if (!hasFunds) {
            throw new Error(
                `Insufficient retained funds for booking ${booking.id}`,
            );
        }

        // 5. Verificar invariantes económicas
        const total =
            payout.artistAmountCents +
            payout.managerAmountCents +
            payout.artimeFeeCents;

        if (total !== payout.grossAmountCents) {
            throw new Error(
                `Payout ${payout.id} has invalid amount split`,
            );
        }

        // 6. Bloqueo lógico del payout
        await this.payoutRepository.lockById(payout.id);

        try {
            // 7. Ejecución de transfers
            await this.transferProvider.transferToArtist({
                artistId: payout.artistId,
                amountCents: payout.artistAmountCents,
                currency: payout.currency,
                bookingId: payout.bookingId,
            });

            if (payout.managerId && payout.managerAmountCents > 0) {
                await this.transferProvider.transferToManager({
                    managerId: payout.managerId,
                    amountCents: payout.managerAmountCents,
                    currency: payout.currency,
                    bookingId: payout.bookingId,
                });
            }

            // 8. Persistencia final — ÉXITO
            await this.payoutRepository.markAsPaid({
                payoutId: payout.id,
                executedAt: new Date(),
            });

        } catch (error: any) {
            // 9. Persistencia final — FALLO
            await this.payoutRepository.markAsFailed({
                payoutId: payout.id,
                failedAt: new Date(),
                reason: error?.message ?? 'Unknown payout execution error',
            });

            // Re-lanzamos para logging / observabilidad superior
            throw error;
        }


    }

}
