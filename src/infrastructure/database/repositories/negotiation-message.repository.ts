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
      sender_user_id: message.senderUserId,
      message: message.message ?? null,
      proposed_fee: message.proposedFee ?? null,
      is_final_offer: message.isFinalOffer,
      created_at: message.createdAt,
    };
    console.log('[NEGOTIATION SAVE] Insertando mensaje:', persistence);
    const { error } = await supabase.from('negotiation_messages').insert(persistence);
    if (error) {
      console.error('[NEGOTIATION SAVE] Error al insertar mensaje:', error);
      throw new Error(error.message);
    } else {
      console.log('[NEGOTIATION SAVE] Mensaje insertado correctamente');
    }
  }

  async findByBookingId(bookingId: string): Promise<NegotiationMessage[]> {
  const { data, error } = await supabase
    .from('negotiation_messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data.map(
    (row) =>
      new NegotiationMessage({
        id: row.id,
        bookingId: row.booking_id,
        senderRole: row.sender_role,
        senderUserId: row.sender_user_id,
        message: row.message,
        proposedFee: row.proposed_fee,
        isFinalOffer: row.is_final_offer,
        createdAt: new Date(row.created_at),
      }),
  );
}

async findLastByBookingId(
  bookingId: string,
): Promise<NegotiationMessage | null> {
  const { data, error } = await supabase
    .from('negotiation_messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return new NegotiationMessage({
    id: data.id,
    bookingId: data.booking_id,
    senderRole: data.sender_role,
    senderUserId: data.sender_user_id,
    message: data.message,
    proposedFee: data.proposed_fee,
    isFinalOffer: data.is_final_offer,
    createdAt: new Date(data.created_at),
  });
}


  async findAcceptedFinalOffer(bookingId: string) {
    const { data, error } = await supabase
      .from('negotiation_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('is_final_offer', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No hay oferta final aceptada
      return null;
    }

    return data;
  }
}
