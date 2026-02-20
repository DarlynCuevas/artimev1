import { NegotiationSenderRole } from './negotiations/negotiation-message.entity';
import type { BookingHandlerRole } from './domain/booking-handler.mapper';

type AnyRole = NegotiationSenderRole | BookingHandlerRole | null | undefined;

export function isArtistSide(role: AnyRole): boolean {
  return role === 'ARTIST' || role === 'MANAGER';
}

export function isVenueSide(role: AnyRole): boolean {
  return role === 'VENUE' || role === 'PROMOTER';
}

export function isSameSide(a: AnyRole, b: AnyRole): boolean {
  if (!a || !b) return false;
  return (
    (isArtistSide(a) && isArtistSide(b)) ||
    (isVenueSide(a) && isVenueSide(b))
  );
}

export function isArtistSideOwnerLocked(params: {
  currentRole: AnyRole;
  currentUserId?: string | null;
  ownerRole?: AnyRole;
  ownerUserId?: string | null;
}): boolean {
  const { currentRole, currentUserId, ownerRole, ownerUserId } = params;
  if (!isArtistSide(currentRole)) return false;
  if (!isArtistSide(ownerRole)) return false;
  if (!ownerUserId || !currentUserId) return false;
  return ownerUserId !== currentUserId;
}
