import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { PROMOTER_REPOSITORY } from '../repositories/promoter-repository.token';
import type { PromoterRepository } from '../repositories/promoter.repository.interface';
import { Injectable } from '@nestjs/common';
import { GetPromoterProfileQuery } from '../queries/get-promoter-profile.query';
import { UpdatePromoterProfileUseCase } from '../use-cases/update-promoter-profile.usecase';
import { GetEventsQuery } from '../../events/queries/get-events.query';
import { GetPromoterDashboardUseCase } from '../use-cases/dashboard-promoter.usecase';
import { PromoterGalleryRepository } from '@/src/infrastructure/database/repositories/promoter/promoter-gallery.repository';
import { PromoterVideoRepository } from '@/src/infrastructure/database/repositories/promoter/promoter-video.repository';
import { supabase } from '@/src/infrastructure/database/supabase.client';


@Injectable()
export class PromoterService {
  constructor(
    private readonly getPromoterProfileQuery: GetPromoterProfileQuery,
    private readonly updatePromoterProfileUseCase: UpdatePromoterProfileUseCase,
    private readonly getEventsQuery: GetEventsQuery,
    @Inject(PROMOTER_REPOSITORY)
    private readonly promoterRepository: PromoterRepository,
    private readonly getPromoterDashboardUseCase: GetPromoterDashboardUseCase, // Reemplaza 'any' con el tipo correcto cuando esté disponible
    private readonly promoterGalleryRepository: PromoterGalleryRepository,
    private readonly promoterVideoRepository: PromoterVideoRepository,
  ) {}
  async findByUserId(userId: string) {
    return this.promoterRepository.findByUserId(userId);
  }

  getProfile(promoterId: string) {
    return this.getPromoterProfileQuery.execute(promoterId);
  }

  updateProfile(command: {
    promoterId: string;
    name?: string;
    description?: string;
    city?: string;
    country?: string;
    eventTypes?: string[];
    isPublic?: boolean;
    showPastEvents?: boolean;
  }) {
    return this.updatePromoterProfileUseCase.execute(command);
  }

  getEvents(promoterId: string) {
    return this.getEventsQuery.execute({
      organizerPromoterId: promoterId,
      organizerVenueId: null,
    });
  }

  getPromoterDashboard(promoterId: string) {
   
    // Llama al use case y retorna el resultado
    return this.getPromoterDashboardUseCase.execute(promoterId);
  }

  async getPromoterGallery(promoterId: string) {
    const items = await this.promoterGalleryRepository.listByPromoterId(promoterId);
    const withUrls = await Promise.all(
      items.map(async (item) => {
        const { data, error } = await supabase.storage
          .from('promoter-gallery')
          .createSignedUrl(item.path, 60 * 60);

        if (!error && data?.signedUrl) {
          return {
            id: item.id,
            createdAt: item.created_at,
            url: data.signedUrl,
          };
        }

        const publicUrl = supabase.storage
          .from('promoter-gallery')
          .getPublicUrl(item.path)?.data?.publicUrl ?? null;

        return {
          id: item.id,
          createdAt: item.created_at,
          url: publicUrl,
        };
      }),
    );

    return withUrls.filter((item) => item.url);
  }

  async addPromoterGalleryItem(params: { promoterId: string; userId: string; file: { buffer: Buffer; mimetype: string; originalname: string } }) {
    const { promoterId, userId, file } = params;

    const existing = await this.promoterGalleryRepository.countByPromoterId(promoterId);
    if (existing >= 6) {
      throw new BadRequestException('MAX_GALLERY_IMAGES_REACHED');
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const storagePath = `promoters/${promoterId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('promoter-gallery')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(uploadError.message);
    }

    await this.promoterGalleryRepository.insert({
      promoter_id: promoterId,
      user_id: userId,
      path: storagePath,
    });

    return { ok: true };
  }

  async removePromoterGalleryItem(params: { promoterId: string; itemId: string }) {
    const item = await this.promoterGalleryRepository.findById(params.itemId);
    if (!item || item.promoter_id !== params.promoterId) {
      throw new NotFoundException('GALLERY_ITEM_NOT_FOUND');
    }

    await this.promoterGalleryRepository.deleteById(item.id);
    await supabase.storage.from('promoter-gallery').remove([item.path]);

    return { ok: true };
  }

  async getPromoterVideos(promoterId: string) {
    const items = await this.promoterVideoRepository.listByPromoterId(promoterId);
    return items.map((item) => ({
      id: item.id,
      youtubeId: item.youtube_id,
      title: item.title ?? null,
      createdAt: item.created_at,
    }));
  }

  async addPromoterVideo(params: { promoterId: string; userId: string; url: string; title?: string | null }) {
    const { promoterId, userId, url, title } = params;

    const existing = await this.promoterVideoRepository.countByPromoterId(promoterId);
    if (existing >= 4) {
      throw new BadRequestException('MAX_VIDEOS_REACHED');
    }

    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) {
      throw new BadRequestException('INVALID_YOUTUBE_URL');
    }

    await this.promoterVideoRepository.insert({
      promoter_id: promoterId,
      user_id: userId,
      youtube_id: youtubeId,
      title,
    });

    return { ok: true };
  }

  async removePromoterVideo(params: { promoterId: string; itemId: string }) {
    const item = await this.promoterVideoRepository.findById(params.itemId);
    if (!item || item.promoter_id !== params.promoterId) {
      throw new NotFoundException('VIDEO_NOT_FOUND');
    }

    await this.promoterVideoRepository.deleteById(item.id);

    return { ok: true };
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
