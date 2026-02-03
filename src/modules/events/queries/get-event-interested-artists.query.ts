import { Inject } from '@nestjs/common';
import { EVENT_INVITATION_REPOSITORY } from '../repositories/event-invitation.repository.token';
import type { EventInvitationRepository } from '../repositories/event-invitation.repository';
import { ARTIST_REPOSITORY } from '../../artists/repositories/artist-repository.token';
import type { ArtistRepository } from '../../artists/repositories/artist.repository.interface';

export interface InterestedArtistReadDto {
  invitationId: string;
  artistId: string;
  name: string;
  genres: string[];
  location: string;
  status: string;
  acceptedAt: string | null;
}

export class GetEventInterestedArtistsQuery {
  constructor(
    @Inject(EVENT_INVITATION_REPOSITORY)
    private readonly repo: EventInvitationRepository,
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
  ) {}

  async execute(eventId: string): Promise<InterestedArtistReadDto[]> {
    const invitations = await this.repo.findByEvent(eventId);

    const accepted = invitations
      .filter((inv) => inv.status === 'ACCEPTED')
      .map((inv) => inv);

    const artistProfiles = await Promise.all(
      accepted.map((inv) =>
        this.artistRepository.findPublicProfileById(inv.artistId),
      ),
    );

    return accepted.map((inv, index) => {
      const artist = artistProfiles[index];
      return {
        invitationId: inv.id,
        artistId: inv.artistId,
        name: artist?.name ?? 'Artista',
        genres: artist?.genres ?? [],
        location: artist?.city ?? 'Sin ubicación',
        status: inv.status,
        acceptedAt: inv.respondedAt
          ? inv.respondedAt.toISOString()
          : null,
      };
    });
  }
}
