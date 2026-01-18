import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import { CancellationReason } from '../enums/cancellation-reason.enum';
import { BookingStatus } from '../../booking-status.enum';
import { CreateCancellationCaseUseCase } from './create-cancellation-case.usecase';

interface RequestBookingCancellationParams {
  bookingId: string;
  userId: string;
  userRole: 'ARTIST' | 'MANAGER' | 'VENUE' | 'PROMOTER';
  reason: CancellationReason;
  description?: string;
}

@Injectable()
export class RequestBookingCancellationUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly createCancellationCaseUseCase: CreateCancellationCaseUseCase,
  ) {}

  async execute(params: RequestBookingCancellationParams): Promise<void> {
    const booking = await this.bookingRepository.findById(params.bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const previousStatus = booking.status;

    // 1️ Validar estados cancelables
    const cancelableStatuses: BookingStatus[] = [
      BookingStatus.ACCEPTED,
      BookingStatus.CONTRACT_SIGNED,
      BookingStatus.PAID_PARTIAL,
      BookingStatus.PAID_FULL,
    ];

    if (!cancelableStatuses.includes(previousStatus)) {
      throw new BadRequestException(
        `Booking cannot be cancelled from status ${previousStatus}`,
      );
    }

    // 2️ Detectar impacto económico
    const hasEconomicImpact =
      previousStatus === BookingStatus.PAID_PARTIAL ||
      previousStatus === BookingStatus.PAID_FULL;

    // 3️ Decidir estado final del booking
    booking.status = hasEconomicImpact
      ? BookingStatus.CANCELLED_PENDING_REVIEW
      : BookingStatus.CANCELLED;

    // 4️ Crear expediente SOLO si hay dinero
    if (hasEconomicImpact) {
      await this.createCancellationCaseUseCase.execute({
        bookingId: booking.id,
        requestedByUserId: params.userId,
        requestedByRole: params.userRole,
        reason: params.reason,
        description: params.description,
        bookingStatusAtCancellation: previousStatus,
        paymentStatusAtCancellation:
          previousStatus === BookingStatus.PAID_FULL
            ? 'PAID_FULL'
            : 'PAID_PARTIAL',
      });
    }

    // 5️ Persistir booking
    await this.bookingRepository.save(booking);
  }
}
