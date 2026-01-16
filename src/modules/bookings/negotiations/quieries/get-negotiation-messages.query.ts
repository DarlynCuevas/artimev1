import { Injectable } from '@nestjs/common';
import { NegotiationMessageRepository } from '../../../../infrastructure/database/repositories/negotiation-message.repository';

@Injectable()
export class GetNegotiationMessagesQuery {
  constructor(
    private readonly negotiationMessageRepository: NegotiationMessageRepository,
  ) {}

  async execute(bookingId: string) {
    return this.negotiationMessageRepository.findByBookingId(bookingId);
  }

  
}
