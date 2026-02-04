import { Inject, Injectable } from '@nestjs/common';
import { MANAGER_REPOSITORY } from '../repositories/manager-repository.token';
import type { ManagerRepository } from '../repositories/manager.repository.interface';
import type { Manager } from '../entities/manager.entity';

@Injectable()
export class ManagerService {
  constructor(
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepository: ManagerRepository,
  ) {}

  findByUserId(userId: string) {
    return this.managerRepository.findByUserId(userId);
  }

  getProfile(managerId: string): Promise<Manager | null> {
    return this.managerRepository.findById(managerId);
  }

  async updateProfile(params: { managerId: string; name?: string }) {
    await this.managerRepository.update({
      id: params.managerId,
      name: params.name,
    });
  }
}
