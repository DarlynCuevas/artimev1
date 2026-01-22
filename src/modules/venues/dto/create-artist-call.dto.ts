import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateArtistCallDto {
  @IsDateString()
  date: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}