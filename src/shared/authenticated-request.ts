import { Request } from 'express';

export type UserContext = {
  userId: string;
  artistId?: string | null;
  venueId?: string | null;
  managerId?: string | null;
  promoterId?: string | null;
  roles: {
    ARTIST: boolean;
    VENUE: boolean;
    MANAGER: boolean;
    PROMOTER: boolean;
  };
};

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
  userContext: UserContext;
}
