import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { MAX_COMMENT_LENGTH } from '@vp/shared';

export class CreateCommentDto {
  @IsString()
  @Length(1, MAX_COMMENT_LENGTH)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  parentId?: string;
}
