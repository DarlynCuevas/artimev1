import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CancellationReason } from '../cancellations/enums/cancellation-reason.enum';


export class CancelBookingDto {
  @IsEnum(CancellationReason)
  reason: CancellationReason;

  @IsOptional()
  @IsString()
  description?: string;
}
