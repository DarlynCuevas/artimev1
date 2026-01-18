export const CANCELLATION_CASE_REPOSITORY = 'CANCELLATION_CASE_REPOSITORY';
import { CancellationCase } from "../entities/cancellation-case.entity";

export interface CancellationCaseRepository {
    findById(id: string): Promise<CancellationCase | null>;
    findByBookingId(bookingId: string): Promise<CancellationCase | null>;
    save(cancellationCase: CancellationCase): Promise<void>; 
    update(cancellationCase: CancellationCase): Promise<void>;
}
