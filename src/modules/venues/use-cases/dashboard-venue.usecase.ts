import type { BookingRepository } from "../../bookings/repositories/booking.repository.interface";
import { Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token';
import { ARTIST_REPOSITORY } from "../../artists/repositories/artist-repository.token";
import type { ArtistRepository } from "../../artists/repositories/artist.repository.interface";
import { VenueDashboardDto } from "../dto/venue-dashboard.dto";


@Injectable()
export class GetVenueDashboardUseCase {
    constructor(
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: BookingRepository,
        @Inject(ARTIST_REPOSITORY)
        private readonly artistRepository: ArtistRepository,
    ) { }

    async execute(venueId: string): Promise<VenueDashboardDto> {

        const rows = await this.bookingRepository.findActiveByVenueId(venueId);

        const bookings = rows.map(r => r.booking);
        
        const confirmedSpent = bookings
            .filter(b =>
                ['CONTRACT_SIGNED','PAID_PARTIAL', 'PAID_FULL', 'COMPLETED'].includes(b.status),
            )
            .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

        const expectedSpent = bookings
            .filter(b =>
                ['FINAL_OFFER_SENT','ACCEPTED'].includes(b.status),
            )
            .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);


        return {
            metrics: {
                activeBookingsCount: bookings.length,
                upcomingBookingsCount: bookings.length,
                confirmedSpent,
                expectedSpent,
                pendingActionsCount: bookings.filter(
                    b =>
                        b.status === 'PENDING' ||
                        b.status === 'NEGOTIATING' ||
                        b.status === 'FINAL_OFFER_SENT',
                ).length,
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
