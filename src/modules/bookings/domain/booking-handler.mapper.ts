import { NegotiationSenderRole } from "../negotiations/negotiation-message.entity";

export type BookingHandlerRole = 'ARTIST' | 'MANAGER' | 'VENUE' | 'PROMOTER';
export function mapSenderToHandlerRole(
  sender: NegotiationSenderRole,
): BookingHandlerRole {
  if (sender === NegotiationSenderRole.ARTIST) return 'ARTIST';
  if (sender === NegotiationSenderRole.MANAGER) return 'MANAGER';
  if (sender === NegotiationSenderRole.VENUE) return 'VENUE';
  if (sender === NegotiationSenderRole.PROMOTER) return 'PROMOTER';
  throw new Error('This sender role cannot manage a booking');
}
