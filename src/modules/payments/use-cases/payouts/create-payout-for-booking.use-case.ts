import { Injectable } from '@nestjs/common';


import { Payout, PayoutStatus } from '../../entities/payout.entity';
import type { PayoutRepository } from '../../repositories/payout.repository';
import type { BookingRepository } from '../../../../infrastructure/database/repositories/booking.repository';
import type { PaymentRepository } from '../../../../infrastructure/database/repositories/payment.repository';
import type { SplitCalculator } from '../../split/split-calculator.service';

@Injectable()
export class CreatePayoutForBookingUseCase {
  constructor(
    private readonly payoutRepository: PayoutRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly splitCalculator: SplitCalculator,
  ) {}

  async execute(bookingId: string): Promise<Payout> {
    // 1️ Obtener booking
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // 2️ Validar estado
    if (booking.status !== 'COMPLETED') {
      throw new Error('Booking not completed');
    }

    // 3️ Evitar duplicados
    const existingPayout =
      await this.payoutRepository.findByBookingId(bookingId);

    if (existingPayout) {
      return existingPayout;
    }

    // 4️ Validar milestones
    const schedule = await this.paymentRepository.findScheduleByBookingId(bookingId);
    if (!schedule) {
      throw new Error('Payment schedule not found');
    }
    const milestones = await this.paymentRepository.findMilestonesByScheduleId(schedule.id);
    const hasPendingMilestones = milestones.some(
      (milestone) => milestone.status !== 'PAID',
    );
    if (hasPendingMilestones) {
      throw new Error('Pending payment milestones');
    }

    // 5️ Calcular split (congelado)
    // NOTA: Los porcentajes y managerCommission deben venir del booking o contexto económico
    // Aquí asumimos que booking tiene las props necesarias (ajusta si tu modelo es diferente)
    const split = this.splitCalculator.calculateForPayout({
      bookingId: booking.id,
      totalAmount: schedule.totalAmount,
      artimeCommissionPercentage: booking.artimeCommissionPercentage,
      managerId: booking.managerId,
      managerCommissionPercentage: booking.managerCommissionPercentage,
      currency: booking.currency,
    });

    // 6️ Crear payout
    const payout = new Payout(
      crypto.randomUUID(),
      booking.id,
      booking.artistId,
      booking.managerId ?? null,

      split.grossAmount,
      split.artimeFee,
      split.managerFee,
      split.artistNet,

      booking.currency,
      PayoutStatus.READY_TO_PAY,
    );

    // 7️ Persistir
    await this.payoutRepository.save(payout);

    return payout;
  }
}
