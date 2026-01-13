import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { PAYOUT_REPOSITORY } from '../../repositories/payout.repository.token';
import { BOOKING_REPOSITORY } from '../../../bookings/repositories/booking-repository.token';
import { StripeTransferRole } from '../../../../infrastructure/payments/stripe-transfer-role.enum';

import { PayoutResponseMapper } from '../mappers/payout-response.mapper';
import type { PayoutRepository } from '../../repositories/payout.repository';


@Injectable()
export class PayoutsQueryService {
  constructor(
    @Inject(PAYOUT_REPOSITORY)
    private readonly payoutRepository: PayoutRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: any,
    private readonly payoutMapper: PayoutResponseMapper,
  ) {
    console.log('PAYOUT REPO CLASS →', payoutRepository.constructor.name);
  }

  async getPayoutsForUser(user: { id: string; role: string }) {
    console.log('PAYOUT QUERY USER →', user);
    if (user.role === StripeTransferRole.ARTIST) {
      const payouts = await this.payoutRepository.findByArtistId(user.id);
      return Promise.all(
        payouts.map(async (payout) => {
          let booking = await this.bookingRepository.findById(payout.bookingId);
          booking = booking
            ? {
                id: booking.id,
                date: booking.createdAt,
                venueName: booking.venueId, // ajusta si tienes nombre de venue
              }
            : { id: payout.bookingId };
          return this.payoutMapper.toDto({ ...payout, booking });
        })
      );
    }

    if (user.role === StripeTransferRole.MANAGER) {
      const payouts = await this.payoutRepository.findByManagerId(user.id);
      return Promise.all(
        payouts.map(async (payout) => {
          let booking = await this.bookingRepository.findById(payout.bookingId);
          booking = booking
            ? {
                id: booking.id,
                date: booking.createdAt,
                venueName: booking.venueId, // ajusta si tienes nombre de venue
              }
            : { id: payout.bookingId };
          return this.payoutMapper.toDto({ ...payout, booking });
        })
      );
    }

    throw new ForbiddenException();
  }

  async getPayoutByIdForUser(
    payoutId: string,
    user: { id: string; role: string },
  ) {
    const payout = await this.payoutRepository.findById(
      payoutId,
    );
console.log('PAYOUT FOUND →', payout);
    if (!payout) return null;

    if (
      (user.role === StripeTransferRole.ARTIST &&
        payout.artistId === user.id) ||
      (user.role === StripeTransferRole.MANAGER &&
        payout.managerId === user.id)
    ) {
      return this.payoutMapper.toDto(payout);
    }

    throw new ForbiddenException();
  }
}
