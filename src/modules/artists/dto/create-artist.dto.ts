import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { ArtistFormat } from '../enums/artist-format.enum';
import type { ArtistBookingConditions } from '../types/artist-booking-conditions';

export class CreateArtistDto {
    @IsNumber()
    rating?: number;

    @IsString()
    managerId?: string;

    @IsString()
    managerName?: string;
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsArray()
  @IsString({ each: true })
  genres: string[];

  @IsString()
  bio: string;



  @IsEnum(ArtistFormat)
  format: ArtistFormat;

  @IsNumber()
  basePrice: number;

  @IsString()
  currency: string;

  @IsBoolean()
  isNegotiable: boolean;

  bookingConditions?: ArtistBookingConditions;
}
