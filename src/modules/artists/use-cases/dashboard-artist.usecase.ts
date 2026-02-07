import { Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface';
import { ArtistDashboardDto } from '../dto/artist-dashboard.dto';
import { ArtistCalendarBlockRepository } from '@/src/infrastructure/database/repositories/artist/artist-calendar-block.repository';

@Injectable()
export class GetArtistDashboardUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly blockRepository: ArtistCalendarBlockRepository,
  ) {}

  async execute(artistId: string): Promise<ArtistDashboardDto> {
    const today = new Date();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
    const monthStartIso = monthStart.toISOString().slice(0, 10);
    const monthEndIso = monthEnd.toISOString().slice(0, 10);
    const daysInMonth = monthEnd.getUTCDate();

    const rows = await this.bookingRepository.findActiveByArtistId(artistId);
    const bookings = rows.map((r) => r.booking);

    const reservedStatuses = [
      'ACCEPTED',
      'CONTRACT_SIGNED',
      'PAID_PARTIAL',
      'PAID_FULL',
      'COMPLETED',
    ];

    const reservedDays = new Set(
      bookings
        .filter(
          (b) =>
            b.start_date &&
            reservedStatuses.includes(b.status) &&
            b.start_date >= monthStartIso &&
            b.start_date <= monthEndIso,
        )
        .map((b) => b.start_date.slice(0, 10)),
    );

    const { data: blocks } = await this.blockRepository.findByArtistBetween(
      artistId,
      monthStartIso,
      monthEndIso,
    );
    const blockedDays = new Set((blocks ?? []).map((b: any) => b.date));

    const occupancyRate = Math.min(
      1,
      (reservedDays.size + blockedDays.size) / Math.max(1, daysInMonth),
    );

    const confirmedIncome = bookings
      .filter((b) =>
        ['CONTRACT_SIGNED', 'PAID_PARTIAL', 'PAID_FULL', 'COMPLETED'].includes(
          b.status,
        ),
      )
      .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

    const expectedIncome = bookings
      .filter((b) => ['FINAL_OFFER_SENT', 'ACCEPTED'].includes(b.status))
      .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

    const forecastIncome = confirmedIncome + expectedIncome;

    const actionableStatuses = ['PENDING', 'NEGOTIATING', 'FINAL_OFFER_SENT'];

    const actionableRows = rows.filter((row) => actionableStatuses.includes(row.booking.status));

    const pendingActions = actionableRows
      .map((row) => {
        const booking = row.booking;
        const startDate = booking.start_date ? new Date(booking.start_date) : null;
        const message =
          booking.status === 'FINAL_OFFER_SENT'
            ? 'Oferta final pendiente de decisión'
            : booking.status === 'NEGOTIATING'
              ? 'Responde a la última propuesta enviada'
              : 'Confirma disponibilidad y responde la solicitud';

        const isSoon = startDate
          ? (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 14
          : false;

        const priority: 'high' | 'medium' | 'low' =
          booking.status === 'FINAL_OFFER_SENT' || isSoon
            ? 'high'
            : booking.status === 'NEGOTIATING'
              ? 'medium'
              : 'low';

        return {
          bookingId: booking.id,
          venueName: row.venueName,
          status: booking.status,
          startDate: startDate ? startDate.toISOString() : null,
          message,
          priority,
        };
      })
      .sort((a, b) => {
        const weight = { high: 0, medium: 1, low: 2 } as const;
        if (weight[a.priority] !== weight[b.priority]) {
          return weight[a.priority] - weight[b.priority];
        }
        const dateA = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
        return dateA - dateB;
      })
      .slice(0, 3);

    const pendingActionsCount = actionableRows.length;

    return {
      metrics: {
        activeBookingsCount: bookings.length,
        upcomingBookingsCount: bookings.length,
        expectedIncome,
        confirmedIncome,
        pendingActionsCount,
        forecastIncome,
        occupancyRate,
        reservedDaysCount: reservedDays.size,
        blockedDaysCount: blockedDays.size,
      },
      upcomingBookings: rows.map((r) => ({
        bookingId: r.booking.id,
        venueName: r.venueName,
        startDate: r.booking.start_date
          ? new Date(r.booking.start_date).toISOString()
          : '',
        status: r.booking.status,
        totalAmount: r.booking.totalAmount ?? 0,
        currency: r.booking.currency ?? 'EUR',
      })),
      pendingActions,
    };
  }
}
