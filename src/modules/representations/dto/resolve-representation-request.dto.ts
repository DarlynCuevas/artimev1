import { IsIn } from 'class-validator';

export class ResolveRepresentationRequestDto {
  @IsIn(['ACCEPT', 'REJECT'])
  action!: 'ACCEPT' | 'REJECT';
}
