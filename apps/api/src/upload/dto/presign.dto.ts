import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_VIDEO_SIZE_BYTES,
} from '@vp/shared';

export class PresignDto {
  @IsString()
  @MaxLength(200)
  filename: string;

  @IsIn([...ALLOWED_VIDEO_MIME_TYPES])
  contentType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_VIDEO_SIZE_BYTES)
  size: number;
}
