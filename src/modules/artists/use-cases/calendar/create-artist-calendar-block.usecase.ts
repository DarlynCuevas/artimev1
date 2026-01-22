import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { CreateCalendarBlockDto } from '../../dto/calendar/create-calendar-block.dto';
import { ARTIST_REPOSITORY } from '../../repositories/artist-repository.token';
import type { ArtistRepository } from '../../repositories/artist.repository.interface';
import { BOOKING_REPOSITORY } from '../../../bookings/repositories/booking-repository.token';
import type { BookingRepository } from '../../../bookings/repositories/booking.repository.interface';
import { ArtistCalendarBlockRepository } from '@/src/infrastructure/database/repositories/artist/artist-calendar-block.repository';

@Injectable()
export class CreateArtistCalendarBlockUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepo: ArtistRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: BookingRepository,
    private readonly blockRepo: ArtistCalendarBlockRepository,
  ) {}

  async execute(userId: string, dto: CreateCalendarBlockDto) {
    const artist = await this.artistRepo.findByUserId(userId);
    if (!artist) {
      throw new BadRequestException('Artist not found');
    }

    const existing = await this.blockRepo.findByArtistAndDate(artist.id, dto.date);
    if (existing.data) {
      throw new ConflictException('Date already blocked');
    }

    const conflictingBooking = await this.bookingRepo.findConfirmedByArtistAndDate(
      artist.id,
      dto.date,
    );

    if (conflictingBooking) {
      throw new BadRequestException('Cannot block date with confirmed booking');
    }

    const { data, error } = await this.blockRepo.create({
      artist_id: artist.id,
      date: dto.date,
      reason: dto.reason,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }
}
