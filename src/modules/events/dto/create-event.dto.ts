// create-event.dto.ts
import { IsDateString, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsDateString()
  start_date: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  estimatedBudget?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

