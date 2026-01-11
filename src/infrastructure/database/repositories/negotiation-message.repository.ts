// negotiation-message.repository.ts

import { supabase } from '../supabase.client';
import {
  NegotiationMessage,
  NegotiationSenderRole,
} from '../../../modules/bookings/negotiations/negotiation-message.entity';

export class NegotiationMessageRepository {
  async save(message: NegotiationMessage): Promise<void> {
    const persistence = {
      id: message.id,
      booking_id: message.bookingId,
      sender_role: message.senderRole,
      message: message.message ?? null,
      proposed_fee: message.proposedFee ?? null,
      is_final_offer: message.isFinalOffer,
      created_at: message.createdAt,
    };

    await supabase.from('negotiation_messages').insert(persistence);
  }

  async findByBookingId(
    bookingId: string,
  ): Promise<NegotiationMessage[]> {
    const { data, error } = await supabase
      .from('negotiation_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(
      (row) =>
        new NegotiationMessage({
          id: row.id,
          bookingId: row.booking_id,
          senderRole: row.sender_role as NegotiationSenderRole,
          message: row.message ?? undefined,
          proposedFee: row.proposed_fee ?? undefined,
          isFinalOffer: row.is_final_offer,
          createdAt: new Date(row.created_at),
        }),
    );
  }
}
