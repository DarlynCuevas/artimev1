import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { BOOKING_REPOSITORY } from '../../bookings/repositories/booking-repository.token'
import { ARTIST_REPOSITORY } from '../../artists/repositories/artist-repository.token'
import type { BookingRepository } from '../../bookings/repositories/booking.repository.interface'
import type { ArtistRepository } from '../../artists/repositories/artist.repository.interface'
import { mapVenueToPublicDto } from '../mappers/venue-public.mapper'
import type { VenueRepository } from '../repositories/venue.repository.interface'
import { VENUE_REPOSITORY } from '../repositories/venue-repository.token'

@Injectable()
export class VenueDiscoverService {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepo: ArtistRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: BookingRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
  ) {}

  async findAvailableArtists(filters: {
    date: string
    city?: string
    genre?: string
    minPrice?: number
    maxPrice?: number
    search?: string
  }) {
    return this.artistRepo.findAvailableForDate(filters)
  }

  
}

