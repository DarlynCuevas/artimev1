import { Inject, Injectable } from "@nestjs/common";
import { BOOKING_REPOSITORY } from "../../bookings/repositories/booking-repository.token";
import { ARTIST_REPOSITORY } from "../../artists/repositories/artist-repository.token";
import type { BookingRepository } from "../../bookings/repositories/booking.repository.interface";
import type { ArtistRepository } from "../../artists/repositories/artist.repository.interface";
import type { PromoterRepository } from "../repositories/promoter.repository.interface";
import { PROMOTER_REPOSITORY } from "../repositories/promoter-repository.token";
import { GetEventsQuery } from "../../events/queries/get-events.query";
import { GetEventBookingsQuery } from "../../events/queries/get-event-bookings.query";
import { EventStatus } from "../../events/enums/event-status.enum";
import { BookingStatus } from "../../bookings/booking-status.enum";



@Injectable()
export class GetPromoterDashboardUseCase {
    constructor(
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: BookingRepository,
        @Inject(ARTIST_REPOSITORY)
        private readonly artistRepository: ArtistRepository,
        @Inject(PROMOTER_REPOSITORY)
        private readonly promoterRepository: PromoterRepository,
        private readonly getEventsQuery: GetEventsQuery,
        private readonly getEventBookingsQuery: GetEventBookingsQuery,
    ) { }

    async execute(promoterId: string): Promise<any> {
        // 1. Perfil del promotor (mock, reemplaza por consulta real si tienes repositorio)
        const profile = (await this.promoterRepository.findById(promoterId)) ?? {
            id: promoterId,
            name: 'Promotor',
            created_at: new Date(),
        };

        // 2. Eventos del promotor (mock, reemplaza por consulta real si tienes repositorio de eventos)
        // Aquí puedes usar tu repositorio de eventos para obtener los eventos reales
        const events = await this.getEventsQuery.execute({
            organizerPromoterId: promoterId,
            organizerVenueId: null,
        });

        let confirmedArtists = 0;
        const confirmedStatuses = [
            BookingStatus.CONTRACT_SIGNED,
            BookingStatus.PAID_FULL,
            BookingStatus.PAID_PARTIAL,
            BookingStatus.COMPLETED
        ];
        for (const event of events) {
            const bookings = await this.getEventBookingsQuery.execute(event.id);
            confirmedArtists += bookings.filter(b => confirmedStatuses.includes(b.status)).length;
        }
        // 3. Métricas
        const metrics = {
            totalEvents: events.length,
            activeEvents: events.filter(e => e.status === EventStatus.SEARCHING).length,
            draftEvents: events.filter(e => e.status === EventStatus.DRAFT).length,
            confirmedEvents: events.filter(e => e.status === EventStatus.CONFIRMED).length,
            confirmedArtists: confirmedArtists,


        };

        return {
            profile,
            metrics,
            events,
        };
    }



}
