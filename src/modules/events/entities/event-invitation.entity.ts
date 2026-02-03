export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export class EventInvitation {
  constructor(
    public readonly id: string,
    public readonly eventId: string,
    public readonly artistId: string,
    public status: InvitationStatus,
    public readonly createdAt: Date,
    public respondedAt: Date | null,
  ) {}
}
