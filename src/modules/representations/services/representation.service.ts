import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '@/src/modules/artists/repositories/artist-repository.token';
import type { ArtistRepository } from '@/src/modules/artists/repositories/artist.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { OutboxRepository } from '../../../infrastructure/database/repositories/outbox/outbox.repository';
import { REPRESENTATION_CONTRACT_REPOSITORY, REPRESENTATION_REQUEST_REPOSITORY } from '../repositories/representation-repository.tokens';
import type { RepresentationRequestRepository } from '../repositories/representation-request.repository.interface';
import type { RepresentationContractRepository } from '../repositories/representation-contract.repository.interface';
import type { RepresentationRequestStatus } from '../representation-status.enum';

@Injectable()
export class RepresentationService {
  constructor(
    @Inject(ARTIST_REPOSITORY) private readonly artistRepo: ArtistRepository,
    @Inject(MANAGER_REPOSITORY) private readonly managerRepo: ManagerRepository,
    @Inject(REPRESENTATION_REQUEST_REPOSITORY) private readonly requestRepo: RepresentationRequestRepository,
    @Inject(REPRESENTATION_CONTRACT_REPOSITORY) private readonly contractRepo: RepresentationContractRepository,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async createRequest(params: { artistId: string; managerId: string; commissionPercentage: number }) {
    const { artistId, managerId, commissionPercentage } = params;

    const artist = await this.artistRepo.findById(artistId);
    if (!artist) throw new NotFoundException('ARTIST_NOT_FOUND');

    const manager = await this.managerRepo.findById(managerId);
    if (!manager) throw new NotFoundException('MANAGER_NOT_FOUND');

    const activeContract = await this.contractRepo.findActiveByArtist(artistId);
    if (activeContract) throw new BadRequestException('ARTIST_ALREADY_HAS_MANAGER');

    if (artist.managerId) {
      throw new BadRequestException('ARTIST_ALREADY_HAS_MANAGER');
    }

    const pending = await this.requestRepo.findPendingByArtistAndManager(artistId, managerId);
    if (pending) throw new BadRequestException('PENDING_REQUEST_EXISTS');

    const request = await this.requestRepo.create({ artistId, managerId, commissionPercentage });

    await this.outboxRepo.enqueue({
      type: 'REPRESENTATION_REQUEST_CREATED',
      payload: {
        requestId: request.id,
        artistId,
        managerId,
        managerName: manager.name ?? null,
        commissionPercentage,
      },
    });

    return request;
  }

  async resolveRequest(params: { requestId: string; artistId: string; action: 'ACCEPT' | 'REJECT' }) {
    const { requestId, artistId, action } = params;

    const request = await this.requestRepo.findById(requestId);
    if (!request) throw new NotFoundException('REQUEST_NOT_FOUND');

    const manager = await this.managerRepo.findById(request.managerId);
    if (!manager) throw new NotFoundException('MANAGER_NOT_FOUND');

    if (request.artistId !== artistId) {
      throw new ForbiddenException('ONLY_ARTIST_CAN_RESOLVE');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('REQUEST_ALREADY_RESOLVED');
    }

    if (action === 'REJECT') {
      const ok = await this.requestRepo.markResolved({ id: requestId, status: 'REJECTED', resolvedAt: new Date().toISOString() });
      if (!ok) throw new BadRequestException('REQUEST_ALREADY_RESOLVED');

      await this.outboxRepo.enqueue({
        type: 'REPRESENTATION_REQUEST_RESOLVED',
        payload: {
          requestId,
          artistId: request.artistId,
          managerId: request.managerId,
          managerUserId: manager.userId,
          result: 'REJECTED',
        },
      });

      return { status: 'REJECTED' as RepresentationRequestStatus };
    }

    // ACCEPT path
    const activeContract = await this.contractRepo.findActiveByArtist(artistId);
    if (activeContract) throw new BadRequestException('ARTIST_ALREADY_HAS_MANAGER');

    const artist = await this.artistRepo.findById(artistId);
    if (!artist) throw new NotFoundException('ARTIST_NOT_FOUND');

    if (artist.managerId && artist.managerId !== request.managerId) {
      throw new BadRequestException('ARTIST_ALREADY_HAS_MANAGER');
    }

    const startDate = new Date().toISOString().split('T')[0];

    const contract = await this.contractRepo.createActive({
      artistId: request.artistId,
      managerId: request.managerId,
      commissionPercentage: request.commissionPercentage,
      startDate,
    });

    // shortcut en artists
    await this.artistRepo.updateProfile(artistId, { managerId: request.managerId });

    const ok = await this.requestRepo.markResolved({ id: requestId, status: 'ACCEPTED', resolvedAt: new Date().toISOString() });
    if (!ok) throw new BadRequestException('REQUEST_ALREADY_RESOLVED');

    await this.outboxRepo.enqueue({
      type: 'REPRESENTATION_REQUEST_RESOLVED',
      payload: {
        requestId,
        artistId: request.artistId,
        managerId: request.managerId,
        managerUserId: manager.userId,
        result: 'ACCEPTED',
        contractId: contract.id,
      },
    });

    return { status: 'ACCEPTED' as RepresentationRequestStatus };
  }
}
