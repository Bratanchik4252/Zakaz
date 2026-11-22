import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsString, MaxLength } from 'class-validator';
import { TargetType } from '@prisma/client';

export class VoteDto {
  @IsEnum(TargetType)
  targetType: TargetType;

  @IsString()
  @MaxLength(40)
  targetId: string;

  @Type(() => Number)
  @IsIn([-1, 0, 1])
  value: number;
}
