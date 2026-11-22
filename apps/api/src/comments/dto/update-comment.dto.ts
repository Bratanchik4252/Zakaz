import { IsString, Length } from 'class-validator';
import { MAX_COMMENT_LENGTH } from '@vp/shared';

export class UpdateCommentDto {
  @IsString()
  @Length(1, MAX_COMMENT_LENGTH)
  body: string;
}
