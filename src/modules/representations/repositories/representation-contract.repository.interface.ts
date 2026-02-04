import type { RepresentationContractStatus } from '../representation-status.enum';

export type RepresentationContract = {
  id: string;
  artistId: string;
  managerId: string;
  commissionPercentage: number;
  status: RepresentationContractStatus;
  startDate: string;
  endDate?: string | null;
  createdAt: string;
};

export interface RepresentationContractRepository {
  findActiveByArtist(artistId: string): Promise<RepresentationContract | null>;
  createActive(params: { artistId: string; managerId: string; commissionPercentage: number; startDate: string }): Promise<RepresentationContract>;
}
