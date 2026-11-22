import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { TagsController } from './tags.controller';

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [PostsController, TagsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
