import { Request } from 'express';

export type UserContext = {
  userId: string;
  artistId?: string;
  venueId?: string;
  managerId?: string;
  promoterId?: string;
};

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
  userContext: UserContext;
}
