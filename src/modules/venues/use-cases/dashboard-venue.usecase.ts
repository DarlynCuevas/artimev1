import type { BookingRepository } from "../../bookings/repositories/booking.repository.interface";
import { Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import { ARTIST_REPOSITORY } from "../../artists/repositories/artist-repository.token";
import type { ArtistRepository } from "../../artists/repositories/artist.repository.interface";
import { VenueDashboardDto } from "../dto/venue-dashboard.dto";
import { BookingStatus } from "../../bookings/booking-status.enum";
import { PAYMENT_MILESTONE_REPOSITORY } from '../../payments/payment-milestone-repository.token';
import type { PaymentMilestoneRepository } from '../../payments/payment-milestone.repository.interface';
import { PaymentMilestoneStatus } from '../../payments/payment-milestone-status.enum';


@Injectable()
export class GetVenueDashboardUseCase {
    constructor(
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: BookingRepository,
        @Inject(ARTIST_REPOSITORY)
        private readonly artistRepository: ArtistRepository,
        @Inject(PAYMENT_MILESTONE_REPOSITORY)
        private readonly paymentMilestoneRepository: PaymentMilestoneRepository,
    ) { }

    async execute(venueId: string): Promise<VenueDashboardDto> {

        const rows = await this.bookingRepository.findActiveByVenueId(venueId);

        const bookings = rows.map(r => r.booking);

        const bookingPaymentSummaries = await Promise.all(
            bookings.map(async (booking) => {
                const totalAmount = booking.totalAmount ?? 0;
                const milestones = await this.paymentMilestoneRepository.findByBookingId(booking.id);

                const paidAmount = milestones
                    .filter((m) =>
                        m.status === PaymentMilestoneStatus.PAID ||
                        m.status === PaymentMilestoneStatus.FINALIZED,
                    )
                    .reduce((sum, m) => sum + (m.amount ?? 0), 0);

                const cappedPaidAmount = Math.min(paidAmount, totalAmount);
                const remainingAmount = Math.max(totalAmount - cappedPaidAmount, 0);

                return {
                    booking,
                    paidAmount: cappedPaidAmount,
                    remainingAmount,
                };
            }),
        );
        
        const confirmedSpent = bookingPaymentSummaries
            .reduce((sum, entry) => sum + entry.paidAmount, 0);

        const expectedSpent = bookingPaymentSummaries
            .filter(({ booking }) =>
                [
                    BookingStatus.ACCEPTED,
                    BookingStatus.CONTRACT_SIGNED,
                    BookingStatus.PAID_PARTIAL,
                    BookingStatus.PAID_FULL,
                    BookingStatus.COMPLETED,
                ].includes(booking.status),
            )
            .reduce((sum, entry) => sum + entry.remainingAmount, 0);


        const pendingContractsCount = bookings.filter(
            b => b.status === BookingStatus.ACCEPTED,
        ).length;

        const pendingPaymentsCount = bookings.filter(
            b => b.status === BookingStatus.CONTRACT_SIGNED || b.status === BookingStatus.PAID_PARTIAL,
        ).length;

        const pendingResponsesCount = bookings.filter(
            b =>
                b.status === BookingStatus.PENDING ||
                b.status === BookingStatus.NEGOTIATING ||
                b.status === BookingStatus.FINAL_OFFER_SENT,
        ).length;

        return {
            metrics: {
                activeBookingsCount: bookings.length,
                upcomingBookingsCount: bookings.length,
                confirmedSpent,
                expectedSpent,
                pendingContractsCount,
                pendingPaymentsCount,
                pendingResponsesCount,
                pendingActionsCount: pendingContractsCount + pendingPaymentsCount + pendingResponsesCount,
            },

            upcomingBookings: rows.map(r => ({
                bookingId: r.booking.id,
                artistName: r.artistName,
                startDate: r.booking.start_date
                    ? new Date(r.booking.start_date).toISOString()
                    : '',
                status: r.booking.status,
                totalAmount: r.booking.totalAmount ?? 0,
                currency: r.booking.currency ?? 'EUR',
            })),
        };

    }



}
