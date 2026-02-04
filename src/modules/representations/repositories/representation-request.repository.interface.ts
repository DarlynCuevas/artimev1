import type { RepresentationRequestStatus } from '../representation-status.enum';

export type RepresentationRequest = {
  id: string;
  artistId: string;
  managerId: string;
  commissionPercentage: number;
  status: RepresentationRequestStatus;
  createdAt: string;
  resolvedAt?: string | null;
};

export interface RepresentationRequestRepository {
  create(params: { artistId: string; managerId: string; commissionPercentage: number }): Promise<RepresentationRequest>;
  findById(id: string): Promise<RepresentationRequest | null>;
  findPendingByArtistAndManager(artistId: string, managerId: string): Promise<RepresentationRequest | null>;
  markResolved(params: { id: string; status: Exclude<RepresentationRequestStatus, 'PENDING'>; resolvedAt: string }): Promise<boolean>;
}
