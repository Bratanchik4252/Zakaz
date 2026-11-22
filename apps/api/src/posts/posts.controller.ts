import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard';
import { RequestUser } from '../common/types';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  list(
    @Query() query: ListPostsDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.posts.list(query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  get(@Param('id') id: string, @CurrentUser() user: RequestUser | null) {
    return this.posts.getById(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: RequestUser) {
    return this.posts.create(user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.posts.remove(id, user);
  }
}
