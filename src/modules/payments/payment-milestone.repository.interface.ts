import { PaymentMilestone } from './payment-milestone.entity';

export interface PaymentMilestoneRepository {
  findById(id: string): Promise<PaymentMilestone | null>;
  findByBookingId(bookingId: string): Promise<PaymentMilestone[]>;
  save(milestone: PaymentMilestone): Promise<void>;
  update(milestone: PaymentMilestone): Promise<void>;
  delete(id: string): Promise<void>;
}
