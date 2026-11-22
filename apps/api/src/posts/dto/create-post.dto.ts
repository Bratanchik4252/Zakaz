import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PostType } from '@prisma/client';
import {
  MAX_POST_BODY_LENGTH,
  MAX_TAGS_PER_POST,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_TITLE_LENGTH,
} from '@vp/shared';

export class CreatePostDto {
  @IsString()
  @Length(MIN_TITLE_LENGTH, MAX_TITLE_LENGTH)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_POST_BODY_LENGTH)
  body?: string;

  @IsEnum(PostType)
  type: PostType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  videoKey?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TAGS_PER_POST)
  @IsString({ each: true })
  @MaxLength(MAX_TAG_LENGTH, { each: true })
  @Type(() => String)
  tags?: string[];
}
