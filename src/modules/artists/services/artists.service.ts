import { Injectable, NotFoundException, Inject, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ARTIST_REPOSITORY } from '../repositories/artist-repository.token';
import type { ArtistRepository } from '../repositories/artist.repository.interface';
import { supabase } from '../../../infrastructure/database/supabase.client';
import { SupabaseClient } from '@supabase/supabase-js';
import { ArtistProps } from '../entities/artist.entity';
import { CreateArtistDto } from '../dto/create-artist.dto';
import { ArtistFormat } from '../enums/artist-format.enum';
import { buildDayRange } from '../utils/build-day-range';
import { GetArtistDashboardUseCase } from '../use-cases/dashboard-artist.usecase';
import { UpdateArtistDto } from '../dto/update-artist.dto';
import { REPRESENTATION_CONTRACT_REPOSITORY, REPRESENTATION_REQUEST_REPOSITORY } from '@/src/modules/representations/repositories/representation-repository.tokens';
import type { RepresentationContractRepository } from '@/src/modules/representations/repositories/representation-contract.repository.interface';
import type { RepresentationRequestRepository } from '@/src/modules/representations/repositories/representation-request.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import { UsersService } from '../../users/services/users.service';
import { ArtistGalleryRepository } from '@/src/infrastructure/database/repositories/artist/artist-gallery.repository';
import { ArtistVideoRepository } from '@/src/infrastructure/database/repositories/artist/artist-video.repository';
import {
  normalizeArtistBookingConditions,
  type ArtistBookingConditions,
} from '../types/artist-booking-conditions';


@Injectable()
export class ArtistsService {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: ArtistRepository,
    private readonly getArtistDashboardUseCase: GetArtistDashboardUseCase,
    @Inject(REPRESENTATION_CONTRACT_REPOSITORY)
    private readonly contractRepo: RepresentationContractRepository,
    @Inject(REPRESENTATION_REQUEST_REPOSITORY)
    private readonly requestRepo: RepresentationRequestRepository,
    @Inject(MANAGER_REPOSITORY)
    private readonly managerRepo: ManagerRepository,
    private readonly usersService: UsersService,
    private readonly artistGalleryRepository: ArtistGalleryRepository,
    private readonly artistVideoRepository: ArtistVideoRepository,
  ) { }

  async findAll() {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findByUserId(userId: string) {
  return this.artistRepository.findByUserId(userId);
}


  async getPublicArtistProfile(artistId: string, viewerManagerId: string | null = null): Promise<CreateArtistDto & {
    id: string;
    canRequestRepresentation: boolean;
    representationStatus: 'NONE' | 'PENDING' | 'ACTIVE' | 'REJECTED';
    representationRequestId: string | null;
    representationCommission: number | null;
    managerName?: string;
    profileImageUrl?: string | null;
    isVerified?: boolean;
  }> {
    const artist = await this.artistRepository.findPublicProfileById(artistId);

    if (!artist) {
      throw new NotFoundException('ARTIST_NOT_FOUND');
    }

    const activeContract = await this.contractRepo.findActiveByArtist(artistId);
    const hasManager = Boolean(artist.managerId || activeContract?.managerId);

    let representationStatus: 'NONE' | 'PENDING' | 'ACTIVE' | 'REJECTED' = hasManager ? 'ACTIVE' : 'NONE';
    let representationRequestId: string | null = null;
    let representationCommission: number | null = null;
    let managerName: string | undefined;

    if (activeContract?.managerId) {
      const manager = await this.managerRepo.findById(activeContract.managerId);
      managerName = manager?.name;
    } else if (artist.managerId) {
      const manager = await this.managerRepo.findById(artist.managerId);
      managerName = manager?.name;
    }

    let canRequestRepresentation = !hasManager;

    if (viewerManagerId && canRequestRepresentation) {
      const pending = await this.requestRepo.findPendingByArtistAndManager(artistId, viewerManagerId);
      if (pending) {
        representationStatus = 'PENDING';
        representationRequestId = pending.id;
        representationCommission = pending.commissionPercentage;
        canRequestRepresentation = false;
      }
    }

    const profileImageUrl = artist.userId
      ? await this.usersService.getSignedProfileImageUrlByUserId(artist.userId)
      : null;

    const isVerified = artist.userId
      ? await this.usersService.isUserVerified(artist.userId)
      : false;

    return {
      id: artist.id,
      name: artist.name,
      city: artist.city,
      genres: artist.genres,
      bio: artist.bio ?? '',
      format: artist.format as ArtistFormat,
      basePrice: artist.basePrice,
      currency: artist.currency,
      isNegotiable: artist.isNegotiable,
      bookingConditions: normalizeArtistBookingConditions(artist.bookingConditions),
      managerId: artist.managerId,
      rating: artist.rating,
      canRequestRepresentation,
      representationStatus,
      representationRequestId,
      representationCommission,
      managerName,
      profileImageUrl,
      isVerified,
    };
  }


  async discover() {
    const artists = await this.artistRepository.findForDiscover();
    if (!artists?.length) return [];

    const withImages = await Promise.all(
      artists.map(async (artist) => {
        const profileImageUrl = artist.userId
          ? await this.usersService.getSignedProfileImageUrlByUserId(artist.userId)
          : null;

        return {
          ...artist,
          profileImageUrl,
        };
      }),
    );

    return withImages;
  }

  async getArtistGallery(artistId: string) {
    const items = await this.artistGalleryRepository.listByArtistId(artistId);
    const withUrls = await Promise.all(
      items.map(async (item) => {
        const { data, error } = await supabase.storage
          .from('artist-gallery')
          .createSignedUrl(item.path, 60 * 60);

        return {
          id: item.id,
          createdAt: item.created_at,
          url: error ? null : data?.signedUrl ?? null,
        };
      }),
    );

    return withUrls.filter((item) => item.url);
  }

  async addArtistGalleryItem(params: { artistId: string; userId: string; file: { buffer: Buffer; mimetype: string; originalname: string } }) {
    const { artistId, userId, file } = params;

    const existing = await this.artistGalleryRepository.countByArtistId(artistId);
    if (existing >= 6) {
      throw new BadRequestException('MAX_GALLERY_IMAGES_REACHED');
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const storagePath = `artists/${artistId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('artist-gallery')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(uploadError.message);
    }

    await this.artistGalleryRepository.insert({
      artist_id: artistId,
      user_id: userId,
      path: storagePath,
    });

    return { ok: true };
  }

  async removeArtistGalleryItem(params: { artistId: string; itemId: string }) {
    const item = await this.artistGalleryRepository.findById(params.itemId);
    if (!item || item.artist_id !== params.artistId) {
      throw new NotFoundException('GALLERY_ITEM_NOT_FOUND');
    }

    await this.artistGalleryRepository.deleteById(item.id);
    await supabase.storage.from('artist-gallery').remove([item.path]);

    return { ok: true };
  }

  async getArtistVideos(artistId: string) {
    const items = await this.artistVideoRepository.listByArtistId(artistId);
    return items.map((item) => ({
      id: item.id,
      youtubeId: item.youtube_id,
      title: item.title ?? null,
      createdAt: item.created_at,
    }));
  }

  async addArtistVideo(params: { artistId: string; userId: string; url: string; title?: string | null }) {
    const { artistId, userId, url, title } = params;

    const existing = await this.artistVideoRepository.countByArtistId(artistId);
    if (existing >= 4) {
      throw new BadRequestException('MAX_VIDEOS_REACHED');
    }

    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) {
      throw new BadRequestException('INVALID_YOUTUBE_URL');
    }

    await this.artistVideoRepository.insert({
      artist_id: artistId,
      user_id: userId,
      youtube_id: youtubeId,
      title: title ?? null,
    });

    return { ok: true };
  }

  async removeArtistVideo(params: { artistId: string; itemId: string }) {
    const item = await this.artistVideoRepository.findById(params.itemId);
    if (!item || item.artist_id !== params.artistId) {
      throw new NotFoundException('VIDEO_NOT_FOUND');
    }
    await this.artistVideoRepository.deleteById(item.id);
    return { ok: true };
  }

  async updateArtistProfile(
    artistId: string,
    dto: UpdateArtistDto,
    opts?: { updatedByUserId?: string; updatedByRole?: 'ARTIST' | 'MANAGER' },
  ) {
    await this.artistRepository.updateProfile(artistId, {
      name: dto.name,
      city: dto.city,
      genres: dto.genres,
      bio: dto.bio,
      format: dto.format,
      basePrice: dto.basePrice,
      currency: dto.currency,
      isNegotiable: dto.isNegotiable,
      bookingConditions:
        dto.bookingConditions !== undefined
          ? normalizeArtistBookingConditions(dto.bookingConditions)
          : undefined,
      bookingConditionsUpdatedByUserId:
        dto.bookingConditions !== undefined ? (opts?.updatedByUserId ?? null) : undefined,
      bookingConditionsUpdatedByRole:
        dto.bookingConditions !== undefined ? (opts?.updatedByRole ?? null) : undefined,
      managerId: dto.managerId ?? null,
      rating: dto.rating,
    });

    return this.getPublicArtistProfile(artistId);
  }

  async getArtistDashboard(artistId: string) {
    return this.getArtistDashboardUseCase.execute(artistId);
  }

  async getBookingConditionsByArtistId(artistId: string): Promise<ArtistBookingConditions> {
    const artist = await this.artistRepository.findPublicProfileById(artistId);
    if (!artist) {
      throw new NotFoundException('ARTIST_NOT_FOUND');
    }
    return normalizeArtistBookingConditions(artist.bookingConditions);
  }

  async updateBookingConditionsAsArtist(params: {
    artistId: string;
    userId: string;
    bookingConditions?: Partial<ArtistBookingConditions> | null;
  }) {
    const artist = await this.artistRepository.findPublicProfileById(params.artistId);
    if (!artist) {
      throw new NotFoundException('ARTIST_NOT_FOUND');
    }

    const normalized = normalizeArtistBookingConditions(params.bookingConditions);

    await this.artistRepository.updateProfile(params.artistId, {
      bookingConditions: normalized,
      bookingConditionsUpdatedByRole: 'ARTIST',
      bookingConditionsUpdatedByUserId: params.userId,
    });

    return {
      artistId: params.artistId,
      bookingConditions: normalized,
      editableBy: 'ARTIST' as const,
    };
  }

  async updateBookingConditionsAsManager(params: {
    artistId: string;
    managerId: string;
    userId: string;
    bookingConditions?: Partial<ArtistBookingConditions> | null;
  }) {
    await this.assertManagerRepresentsArtist(params.managerId, params.artistId);
    const normalized = normalizeArtistBookingConditions(params.bookingConditions);

    await this.artistRepository.updateProfile(params.artistId, {
      bookingConditions: normalized,
      bookingConditionsUpdatedByRole: 'MANAGER',
      bookingConditionsUpdatedByUserId: params.userId,
    });

    return {
      artistId: params.artistId,
      bookingConditions: normalized,
      editableBy: 'MANAGER' as const,
    };
  }

  async managerCanEditArtist(managerId: string, artistId: string): Promise<boolean> {
    const artist = await this.artistRepository.findPublicProfileById(artistId);
    if (!artist) return false;
    if (artist.managerId && artist.managerId === managerId) return true;
    const activeContract = await this.contractRepo.findActiveByArtist(artistId);
    return Boolean(activeContract?.managerId && activeContract.managerId === managerId);
  }

  private async assertManagerRepresentsArtist(managerId: string, artistId: string) {
    const artist = await this.artistRepository.findPublicProfileById(artistId);
    if (!artist) {
      throw new NotFoundException('ARTIST_NOT_FOUND');
    }

    const directManagerMatch = Boolean(artist.managerId && artist.managerId === managerId);
    if (directManagerMatch) return;

    const activeContract = await this.contractRepo.findActiveByArtist(artistId);
    if (activeContract?.managerId === managerId) return;

    throw new ForbiddenException('MANAGER_NOT_ALLOWED_FOR_ARTIST');
  }

  private assertArtistIsComplete(artist: ArtistProps) {
    if (
      !artist.name ||
      !artist.city ||
      !artist.genres?.length ||
      !artist.format ||
      artist.basePrice === null ||
      artist.basePrice === undefined ||
      !artist.currency ||
      artist.isNegotiable === undefined
    ) {
      throw new Error('Artist profile is incomplete');
    }
  }

  async getAvailability(
    artistId: string,
    from: string,
    to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException(
        'INVALID_DATE_RANGE: from and to are required',
      );
    }

    const bookedDates =
      await this.artistRepository.findBookedDates(
        artistId,
        from,
        to,
      );

    const days = buildDayRange(from, to).map(date => ({
      date,
      status: bookedDates.includes(date)
        ? 'BOOKED'
        : 'AVAILABLE',
    }));

    return {
      artistId,
      from,
      to,
      days,
    };
  }

}

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{6,})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}
