import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard';
import { RequestUser } from '../common/types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.users.getMe(user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  profile(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.users.getProfile(id, user?.id ?? null);
  }
}
