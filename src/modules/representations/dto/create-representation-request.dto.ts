import { IsNumber, Min, Max } from 'class-validator';

export class CreateRepresentationRequestDto {
  @IsNumber()
  @Min(0.01)
  @Max(100)
  commissionPercentage!: number;
}
