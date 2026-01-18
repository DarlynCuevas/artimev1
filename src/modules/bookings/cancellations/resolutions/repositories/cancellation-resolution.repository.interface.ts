import { CancellationResolution } from '../cancellation-resolution.entity';

export interface CancellationResolutionRepository {
  findByCancellationCaseId(
    cancellationCaseId: string,
  ): Promise<CancellationResolution | null>;

  save(resolution: CancellationResolution): Promise<void>;
}
