import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/types';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: RequestUser) {
    return this.subscriptions.list(user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.subscriptions.create(user, dto);
  }

  @Delete(':targetId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('targetId') targetId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.subscriptions.remove(user, targetId);
  }
}
