import { Promoter } from "./domain/promoter.entity";

export interface PromoterRepository {
  /**
   * Devuelve el promotor asociado a un user_id
   * Debe lanzar error o devolver null si no existe
   */
  findByUserId(userId: string): Promise<Promoter | null>;

  /**
   * Devuelve un promotor por su id de dominio
   */
  findById(id: string): Promise<Promoter | null>;

  update(data: {
  id: string;
  name?: string;
  description?: string;
}): Promise<void>;
}
