import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  FEED_OPTIONS,
  FeedOption,
  MAX_SEARCH_QUERY_LENGTH,
  PAGE_SIZE_MAX,
  SORT_OPTIONS,
  SortOption,
} from '@vp/shared';

export class ListPostsDto {
  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort?: SortOption;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_SEARCH_QUERY_LENGTH)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tags?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  authorId?: string;

  @IsOptional()
  @IsIn(FEED_OPTIONS)
  feed?: FeedOption;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_SIZE_MAX)
  limit?: number;
}
