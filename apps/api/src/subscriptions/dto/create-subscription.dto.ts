import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['USER'])
  targetType: 'USER';

  @IsString()
  @MaxLength(40)
  targetId: string;
}
