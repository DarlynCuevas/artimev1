import { CreateArtistDto } from './create-artist.dto';
import { PartialType } from '@nestjs/mapped-types';
export class UpdateArtistDto extends PartialType(CreateArtistDto) {}
