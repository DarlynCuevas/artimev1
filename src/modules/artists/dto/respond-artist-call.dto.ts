import { IsIn } from 'class-validator';

export class RespondArtistCallDto {
  @IsIn(['INTERESTED', 'NOT_INTERESTED'])
  response: 'INTERESTED' | 'NOT_INTERESTED';
}