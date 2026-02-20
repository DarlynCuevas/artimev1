import { Inject, Injectable } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '@/src/modules/artists/repositories/artist-repository.token';
import { VENUE_REPOSITORY } from '@/src/modules/venues/repositories/venue-repository.token';
import { PROMOTER_REPOSITORY } from '@/src/modules/promoter/repositories/promoter-repository.token';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ArtistRepository } from '@/src/modules/artists/repositories/artist.repository.interface';
import type { VenueRepository } from '@/src/modules/venues/repositories/venue.repository.interface';
import type { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import type { Booking } from '@/src/modules/bookings/booking.entity';

const EMPTY_VALUE = '---';

export type ContractTemplateData = Record<string, string>;

@Injectable()
export class ContractTemplateMapper {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
  ) {}

  async mapFromBooking(booking: Booking): Promise<ContractTemplateData> {
    const [artist, venue, promoter, manager] = await Promise.all([
      booking.artistId ? this.artistRepository.findById(booking.artistId) : null,
      booking.venueId ? this.venueRepository.findById(booking.venueId) : null,
      booking.promoterId ? this.promoterRepository.findById(booking.promoterId) : null,
      booking.managerId ? this.managerRepository.findById(booking.managerId) : null,
    ]);

    const contractingPartyName =
      venue?.name ?? promoter?.name ?? booking.venueName ?? EMPTY_VALUE;
    const contractingPartyAddress = venue?.address ?? EMPTY_VALUE;

    const artistPartyName =
      manager?.name ?? artist?.name ?? booking.artistName ?? EMPTY_VALUE;
    const artistName = artist?.name ?? booking.artistName ?? EMPTY_VALUE;

    const eventDate = booking.start_date
      ? formatDate(new Date(booking.start_date))
      : EMPTY_VALUE;

    const eventCity =
      venue?.city ?? promoter?.city ?? booking.venueCity ?? EMPTY_VALUE;

    const eventVenueAddress = venue?.address ?? EMPTY_VALUE;

    const feeAmount = `${booking.totalAmount ?? ''} ${booking.currency ?? ''}`.trim() || EMPTY_VALUE;

    const contractDate = formatDate(new Date());

    return {
      contracting_party_name: normalizeValue(contractingPartyName),
      contracting_party_address: normalizeValue(contractingPartyAddress),
      contracting_party_tax_id: EMPTY_VALUE,
      contracting_party_representative_name: EMPTY_VALUE,
      contracting_party_representative_id: EMPTY_VALUE,

      artist_party_name: normalizeValue(artistPartyName),
      artist_party_id: EMPTY_VALUE,
      artist_party_address: EMPTY_VALUE,
      artist_name: normalizeValue(artistName),

      event_date: eventDate,
      event_city: normalizeValue(eventCity),
      event_venue_address: normalizeValue(eventVenueAddress),
      event_time: EMPTY_VALUE,
      performance_duration: EMPTY_VALUE,
      fee_amount: normalizeValue(feeAmount),
      extras_summary: EMPTY_VALUE,

      milestone_1_amount: EMPTY_VALUE,
      milestone_1_condition: EMPTY_VALUE,
      milestone_2_amount: EMPTY_VALUE,
      milestone_2_condition: EMPTY_VALUE,
      final_payment_amount: EMPTY_VALUE,

      lodging_details: EMPTY_VALUE,
      guest_pass_count: EMPTY_VALUE,
      technical_rider_summary: EMPTY_VALUE,
      hospitality_items: EMPTY_VALUE,

      contract_location: EMPTY_VALUE,
      contract_date: contractDate,
    };
  }
}

function normalizeValue(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY_VALUE;
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
