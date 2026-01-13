import { Payout } from "../../entities/payout.entity";


export interface PayoutRepository {
  findByBookingId(bookingId: string): Promise<Payout | null>;

  //  NUEVOS MÉTODOS (F5)
  findByArtistId(artistId: string): Promise<Payout[]>;
  findByManagerId(managerId: string): Promise<Payout[]>;
  findById(payoutId: string): Promise<Payout | null>;

  save(payout: Payout): Promise<void>;
}
