export interface Manager {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  createdAt?: Date;
}
