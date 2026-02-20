import { ArtistNotificationRepository } from '@/src/infrastructure/database/repositories/notifications/artist-notification.repository';
import type { VenueRepository } from '@/src/modules/venues/repositories/venue.repository.interface';
import type { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { NegotiationSenderRole } from '../negotiations/negotiation-message.entity';
import type { Booking } from '../booking.entity';

type Params = {
  booking: Booking;
  senderRole: NegotiationSenderRole;
  type: string;
  notificationsRepo: ArtistNotificationRepository;
  venueRepository: VenueRepository;
  promoterRepository: PromoterRepository;
  managerRepository: ManagerRepository;
  extraPayload?: Record<string, any>;
};

export async function notifyBookingCounterpart({
  booking,
  senderRole,
  type,
  notificationsRepo,
  venueRepository,
  promoterRepository,
  managerRepository,
  extraPayload,
}: Params) {
  const isArtistSide = senderRole === 'ARTIST' || senderRole === 'MANAGER';

  let venueName = booking.venueName ?? null;
  if (!venueName && booking.venueId) {
    const venue = await venueRepository.findById(booking.venueId);
    venueName = venue?.name ?? null;
  }

  let promoterName: string | null = null;
  if (booking.promoterId) {
    const promoter = await promoterRepository.findById(booking.promoterId);
    promoterName = promoter?.name ?? null;
  }

  const actorName =
    senderRole === 'ARTIST' || senderRole === 'MANAGER'
      ? booking.artistName ?? 'El artista'
      : booking.eventName ?? venueName ?? promoterName ?? 'El organizador';

  const payload = {
    bookingId: booking.id,
    eventId: booking.eventId ?? null,
    eventName: booking.eventName ?? null,
    venueName,
    promoterName,
    artistName: booking.artistName ?? null,
    date: booking.start_date ?? null,
    actorRole: senderRole,
    actorName,
    ...(extraPayload ?? {}),
  };

  if (isArtistSide) {
    const recipients: Array<{ userId: string; role: 'VENUE' | 'PROMOTER' }> = [];

    if (booking.venueId) {
      const venue = await venueRepository.findById(booking.venueId);
      if (venue?.userId) {
        recipients.push({ userId: venue.userId, role: 'VENUE' });
      }
    }

    if (booking.promoterId) {
      const promoter = await promoterRepository.findById(booking.promoterId);
      if (promoter?.user_id) {
        recipients.push({ userId: promoter.user_id, role: 'PROMOTER' });
      }
    }

    if (recipients.length > 0) {
      await notificationsRepo.createManyByUser(
        recipients.map((r) => ({ userId: r.userId, role: r.role, type, payload })),
      );
    }
  } else {
    await notificationsRepo.createMany([
      {
        artistId: booking.artistId,
        type,
        payload,
      },
    ]);

    if (booking.managerId) {
      const manager = await managerRepository.findById(booking.managerId);
      if (manager?.userId) {
        await notificationsRepo.createManyByUser([
          {
            userId: manager.userId,
            role: 'MANAGER',
            type,
            payload,
          },
        ]);
      }
    }
  }
}
