import { Manager } from '../entities/manager.entity';

export interface ManagerRepository {
  findByUserId(userId: string): Promise<Manager | null>;
  findById(id: string): Promise<Manager | null>;
  update(data: { id: string; name?: string }): Promise<void>;
}
