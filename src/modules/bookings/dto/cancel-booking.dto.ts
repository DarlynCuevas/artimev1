import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CancellationReason } from '../cancellations/cancellation-reason.enum';


export class CancelBookingDto {
  @IsEnum(CancellationReason)
  reason: CancellationReason;

  @IsOptional()
  @IsString()
  description?: string;
}
