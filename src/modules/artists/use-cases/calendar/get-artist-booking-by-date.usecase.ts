import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../../repositories/artist-repository.token';
import type { ArtistRepository } from '../../repositories/artist.repository.interface';
import { BOOKING_REPOSITORY } from '../../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../../bookings/repositories/booking.repository.interface';
import { VENUE_REPOSITORY } from '../../../venues/repositories/venue-repository.token';
import type { VenueRepository } from '../../../venues/repositories/venue.repository.interface';

@Injectable()
export class GetArtistBookingByDateUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepo: ArtistRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: BookingRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepo: VenueRepository,
  ) {}

  async execute(userId: string, date: string) {
    const artist = await this.artistRepo.findByUserId(userId);
    if (!artist) {
      throw new NotFoundException('ARTIST_NOT_FOUND');
    }

    const booking = await this.bookingRepo.findConfirmedByArtistAndDate(artist.id, date);

    if (!booking) {
      throw new NotFoundException('BOOKING_NOT_FOUND');
    }

    const venue = booking.venueId ? await this.venueRepo.findById(booking.venueId) : null;

    return {
      id: booking.id,
      status: booking.status,
      startDate: booking.start_date,
      currency: booking.currency,
      totalAmount: booking.totalAmount,
      venue: venue
        ? { id: venue.id, name: venue.name, city: venue.city }
        : booking.venueId
          ? { id: booking.venueId, name: undefined, city: undefined }
          : null,
    };
  }
}