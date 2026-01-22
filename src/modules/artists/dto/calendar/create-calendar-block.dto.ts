import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCalendarBlockDto {
	@IsDateString()
	date: string; // YYYY-MM-DD

	@IsOptional()
	@IsString()
	reason?: string;
}
