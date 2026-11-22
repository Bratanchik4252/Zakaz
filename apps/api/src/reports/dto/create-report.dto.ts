import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import {
  MAX_REPORT_REASON_LENGTH,
  MIN_REPORT_REASON_LENGTH,
} from '@vp/shared';

export class CreateReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  postId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  commentId?: string;

  @IsString()
  @Length(MIN_REPORT_REASON_LENGTH, MAX_REPORT_REASON_LENGTH)
  reason: string;
}
