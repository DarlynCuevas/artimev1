import { Body, Controller, Delete, ForbiddenException, Get, Post, Query, Req, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserContextGuard } from '../../auth/user-context.guard';
import type { AuthenticatedRequest } from '@/src/shared/authenticated-request';
import { CreateArtistCalendarBlockUseCase } from '../use-cases/calendar/create-artist-calendar-block.usecase';
import { CreateCalendarBlockDto } from '../dto/calendar/create-calendar-block.dto';
import { GetArtistCalendarBlocksUseCase } from '../use-cases/calendar/get-artist-calendar-blocks.usecase';
import { DeleteArtistCalendarBlockUseCase } from '../use-cases/calendar/delete-artist-calendar-block.usecase';
import { GetArtistBookingByDateUseCase } from '../use-cases/calendar/get-artist-booking-by-date.usecase';
import { GetArtistBlocksByArtistIdUseCase } from '../use-cases/calendar/get-artist-blocks-by-artist-id.usecase';

@Controller('artist/calendar')
@UseGuards(JwtAuthGuard, UserContextGuard)
export class ArtistCalendarController {
  constructor(
    private readonly createBlockUseCase: CreateArtistCalendarBlockUseCase,
    private readonly getBlocksUseCase: GetArtistCalendarBlocksUseCase,
    private readonly deleteBlockUseCase: DeleteArtistCalendarBlockUseCase,
    private readonly getBookingByDateUseCase: GetArtistBookingByDateUseCase,
    private readonly getArtistBlocksByArtistIdUseCase: GetArtistBlocksByArtistIdUseCase,
  ) {}

  @Post('blocks')
  async createBlock(@Req() req: AuthenticatedRequest, @Body() dto: CreateCalendarBlockDto) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }
    return this.createBlockUseCase.execute(userId, dto);
  }

  @Get('blocks')
  async listBlocks(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }
    if (!from || !to) {
      throw new ForbiddenException('INVALID_RANGE');
    }
    return this.getBlocksUseCase.execute(userId, from, to);
  }

  @Delete('blocks')
  async deleteBlock(
    @Req() req: AuthenticatedRequest,
    @Query('date') date: string,
  ) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }
    if (!date) {
      throw new ForbiddenException('DATE_REQUIRED');
    }
    return this.deleteBlockUseCase.execute(userId, date);
  }

  @Get('booking')
  async getBookingForDate(
    @Req() req: AuthenticatedRequest,
    @Query('date') date: string,
  ) {
    const { artistId, userId } = req.userContext;
    if (!artistId) {
      throw new ForbiddenException('ONLY_ARTIST');
    }
    if (!date) {
      throw new ForbiddenException('DATE_REQUIRED');
    }
    return this.getBookingByDateUseCase.execute(userId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':artistId/blocks')
  async getBlocksForArtist(
    @Param('artistId') artistId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!artistId) {
      throw new ForbiddenException('ARTIST_REQUIRED');
    }
    if (!from || !to) {
      throw new ForbiddenException('INVALID_RANGE');
    }

    return this.getArtistBlocksByArtistIdUseCase.execute(artistId, from, to);
  }
}
