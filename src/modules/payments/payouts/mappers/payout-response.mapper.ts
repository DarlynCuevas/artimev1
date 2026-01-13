import { Injectable } from '@nestjs/common';

@Injectable()
export class PayoutResponseMapper {
  toDto(payout: any) {
    return {
      id: payout.id,
      status: payout.status,
      currency: payout.currency,

      grossAmount: payout.gross_amount,
      artistAmount: payout.artist_net_amount,
      managerAmount: payout.manager_fee_amount,
      artimeFee: payout.artime_fee_amount,

      booking: {
        id: payout.booking_id,
        date: payout.booking?.date,
        venueName: payout.booking?.venue_name,
      },

      executedAt: payout.executed_at ?? undefined,
      failureReason:
        payout.status === 'FAILED'
          ? payout.failure_reason
          : undefined,
    };
  }
}
