import type { BookingRepository } from '../../repositories/booking.repository.interface';
import { BOOKING_REPOSITORY } from '../../repositories/booking-repository.token';
import { Inject, Injectable } from '@nestjs/common';
import { BookingStatus } from '../../booking-status.enum';
import { CancellationInitiator } from '../../cancellations/enums/cancellation-initiator.enum';
import { CancellationReason } from '../../cancellations/enums/cancellation-reason.enum';
import { CancellationReviewStatus } from '../../cancellations/enums/cancellation-review-status.enum';
import { CancellationRecord } from '../../cancellations/entities/cancellation-record.entity';
import type { CancellationRepository } from '../../cancellations/repositories/cancellation.repository.interface';
import { CANCELLATION_REPOSITORY } from '../repositories/cancellation.repository.token';
import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import { VENUE_REPOSITORY } from '@/src/modules/venues/repositories/venue-repository.token';
import type { VenueRepository } from '@/src/modules/venues/repositories/venue.repository.interface';
import { PROMOTER_REPOSITORY } from '@/src/modules/promoter/repositories/promoter-repository.token';
import type { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { notifyBookingCounterpart } from '../../notifications/booking-notifications';
import { NegotiationSenderRole } from '../../negotiations/negotiation-message.entity';

@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    @Inject(CANCELLATION_REPOSITORY)
    private readonly cancellationRepository: CancellationRepository,
    private readonly notificationsRepo: ArtistNotificationRepository,
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: VenueRepository,
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
  ) {}

  async execute(input: {
    bookingId: string;
    initiator: CancellationInitiator;
    reason: CancellationReason;
    description?: string;
  }): Promise<{
    bookingStatus: BookingStatus;
    reviewRequired: boolean;
  }> {
    const booking = await this.bookingRepository.findById(
      input.bookingId,
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (
      booking.status !== BookingStatus.CONTRACT_SIGNED &&
      booking.status !== BookingStatus.PAID_PARTIAL
    ) {
      throw new Error('Booking cannot be cancelled in current state');
    }

    // Validate initiator + reason
    if (
      input.initiator === CancellationInitiator.ARTIST &&
      input.reason === CancellationReason.VENUE
    ) {
      throw new Error('Invalid cancellation reason for artist');
    }

    if (
      input.initiator !== CancellationInitiator.ARTIST &&
      (input.reason === CancellationReason.ARTIST_JUSTIFIED ||
        input.reason === CancellationReason.ARTIST_UNJUSTIFIED)
    ) {
      throw new Error('Invalid cancellation reason for initiator');
    }

    const requiresReview =
      input.initiator === CancellationInitiator.ARTIST &&
      input.reason === CancellationReason.ARTIST_JUSTIFIED;

    const resultingStatus = requiresReview
      ? BookingStatus.CANCELLED_PENDING_REVIEW
      : BookingStatus.CANCELLED;

    const record = new CancellationRecord({
      id: crypto.randomUUID(),
      bookingId: booking.id,
      initiator: input.initiator,
      reason: input.reason,
      description: input.description,
      previousStatus: booking.status,
      resultingStatus,
      reviewStatus: requiresReview
        ? CancellationReviewStatus.PENDING
        : CancellationReviewStatus.NOT_REQUIRED,
      createdAt: new Date(),
    });

    await this.cancellationRepository.save(record);

    booking.changeStatus(resultingStatus);
    await this.bookingRepository.update(booking);

    const senderRole: NegotiationSenderRole =
      input.initiator === CancellationInitiator.ARTIST
        ? NegotiationSenderRole.ARTIST
        : input.initiator === CancellationInitiator.MANAGER
          ? NegotiationSenderRole.MANAGER
          : input.initiator === CancellationInitiator.PROMOTER
            ? NegotiationSenderRole.PROMOTER
            : NegotiationSenderRole.VENUE;

    await notifyBookingCounterpart({
      booking,
      senderRole,
      type: 'BOOKING_CANCELLED',
      notificationsRepo: this.notificationsRepo,
      venueRepository: this.venueRepository,
      promoterRepository: this.promoterRepository,
      managerRepository: this.managerRepository,
    });

    return {
      bookingStatus: resultingStatus,
      reviewRequired: requiresReview,
    };
  }
}
