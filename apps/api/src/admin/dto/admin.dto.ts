import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ResolveReportDto {
  @IsBoolean()
  resolved: boolean;
}

export class BanUserDto {
  @IsBoolean()
  banned: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ApprovePostDto {
  @IsBoolean()
  approved: boolean;
}

export class ListReportsQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  resolved?: 'true' | 'false';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([10, 20, 50])
  limit?: number;
}
