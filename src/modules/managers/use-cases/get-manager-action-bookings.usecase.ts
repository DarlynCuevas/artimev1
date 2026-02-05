import { Inject, Injectable } from '@nestjs/common';
import { BOOKING_REPOSITORY } from '@/src/modules/bookings/repositories/booking-repository.token';
import type { BookingRepository } from '@/src/modules/bookings/repositories/booking.repository.interface';

@Injectable()
export class GetManagerActionBookingsUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(managerId: string) {
    const rows = await this.bookingRepository.findActionRequiredByManagerId(managerId, 3);
    return rows.map((row) => ({
      id: row.booking.id,
      artistName: row.artistName,
      partnerName: row.partnerName,
      date: row.booking.start_date,
      status: row.booking.status,
      actionLabel: 'Revisar booking',
    }));
  }
}
