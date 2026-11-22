import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { TRANSCODE_QUEUE_NAME } from '@vp/shared';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: IORedis;
  private readonly queue: Queue;

  constructor(config: ConfigService) {
    this.connection = new IORedis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.connection.on('error', (error) => {
      this.logger.error(`Redis connection error: ${String(error)}`);
    });
    this.queue = new Queue(TRANSCODE_QUEUE_NAME, {
      connection: this.connection,
    });
  }

  async enqueueTranscode(postId: string): Promise<void> {
    await this.queue.add(
      'transcode',
      { postId },
      {
        jobId: postId,
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    this.connection.disconnect();
  }
}
