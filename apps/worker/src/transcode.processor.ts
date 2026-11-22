import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import IORedis from 'ioredis';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import {
  MAX_VIDEO_DURATION_SECONDS,
  TRANSCODE_QUEUE_NAME,
} from '@vp/shared';
import { DatabaseService, ProcessingPost } from './database.service';
import { StorageService } from './storage.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class TranscodeProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TranscodeProcessor.name);
  private worker: Worker<{ postId: string }> | null = null;
  private connection: IORedis | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  onModuleInit(): void {
    const redisUrl = this.config.getOrThrow<string>('REDIS_URL');
    const rawConcurrency = Number(
      this.config.get<string>('WORKER_CONCURRENCY') ?? 1,
    );
    const concurrency =
      Number.isFinite(rawConcurrency) && rawConcurrency > 0
        ? rawConcurrency
        : 1;

    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.connection.on('error', (error) => {
      this.logger.error(`Redis error: ${String(error)}`);
    });

    this.worker = new Worker<{ postId: string }>(
      TRANSCODE_QUEUE_NAME,
      async (job) => this.process(job.data.postId),
      { connection: this.connection, concurrency },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Transcode job completed: ${job.id}`);
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Transcode job failed: ${job?.id ?? 'unknown'} - ${String(error)}`,
      );
    });

    this.logger.log(`Worker listening on queue "${TRANSCODE_QUEUE_NAME}"`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.connection) {
      this.connection.disconnect();
    }
  }

  private async process(postId: string): Promise<void> {
    const post = await this.db.getPostForProcessing(postId);
    if (
      !post ||
      post.type !== 'VIDEO' ||
      post.status !== 'PENDING' ||
      !post.videoKey
    ) {
      this.logger.warn(`Skipping post ${postId}: not a pending video`);
      return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vp-transcode-'));
    const extension = path.extname(post.videoKey) || '.mp4';
    const inputPath = path.join(tempDir, `input${extension}`);
    const outputPath = path.join(tempDir, 'output.mp4');
    const thumbPath = path.join(tempDir, 'thumb.jpg');

    try {
      this.logger.log(`Downloading ${post.videoKey}`);
      await this.storage.download(post.videoKey, inputPath);

      const duration = await probeDuration(inputPath);
      if (!Number.isFinite(duration) || duration <= 0) {
        await this.reject(post, 'Unable to read video metadata');
        return;
      }

      if (duration > MAX_VIDEO_DURATION_SECONDS + 0.5) {
        await this.reject(
          post,
          `Video is longer than ${MAX_VIDEO_DURATION_SECONDS} seconds`,
        );
        return;
      }

      this.logger.log(`Transcoding post ${post.id} (${duration.toFixed(2)}s)`);
      await transcode(inputPath, outputPath);
      await generateThumbnail(inputPath, thumbPath, duration);

      const videoKey = `videos/${post.authorId}/${post.id}/720.mp4`;
      const thumbKey = `videos/${post.authorId}/${post.id}/thumb.jpg`;

      await this.storage.upload(videoKey, outputPath, 'video/mp4');
      await this.storage.upload(thumbKey, thumbPath, 'image/jpeg');
      await this.db.markReady(post.id, videoKey, thumbKey);
      await this.storage.deleteObject(post.videoKey);

      this.logger.log(`Post ${post.id} is READY`);
    } catch (error) {
      this.logger.error(`Processing failed for post ${post.id}: ${String(error)}`);
      await this.db.markRejected(post.id, 'Video processing failed');
      await this.storage.deleteObject(post.videoKey);
      throw error;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async reject(post: ProcessingPost, reason: string): Promise<void> {
    this.logger.warn(`Rejecting post ${post.id}: ${reason}`);
    await this.db.markRejected(post.id, reason);
    await this.storage.deleteObject(post.videoKey);
  }
}

async function probeDuration(inputPath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ],
    { timeout: 30_000 },
  );

  return Number.parseFloat(stdout.trim());
}

async function transcode(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-nostdin',
      '-i',
      inputPath,
      '-vf',
      'scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-profile:v',
      'main',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      '-max_muxing_queue_size',
      '1024',
      outputPath,
    ],
    { timeout: 15 * 60_000, maxBuffer: 10 * 1024 * 1024 },
  );
}

async function generateThumbnail(
  inputPath: string,
  thumbPath: string,
  duration: number,
): Promise<void> {
  const seek = Math.max(0, Math.min(1, duration / 2)).toFixed(2);

  try {
    await runThumbnail(inputPath, thumbPath, seek);
  } catch {
    await runThumbnail(inputPath, thumbPath, '0');
  }
}

async function runThumbnail(
  inputPath: string,
  thumbPath: string,
  seek: string,
): Promise<void> {
  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-nostdin',
      '-ss',
      seek,
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-2',
      '-q:v',
      '3',
      thumbPath,
    ],
    { timeout: 60_000 },
  );
}
