import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export interface ProcessingPost {
  id: string;
  authorId: string;
  videoKey: string | null;
  type: 'VIDEO' | 'TEXT';
  status: 'PENDING' | 'READY' | 'REJECTED';
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: 5,
    });
  }

  async getPostForProcessing(
    postId: string,
  ): Promise<ProcessingPost | null> {
    const result = await this.pool.query<ProcessingPost>(
      `SELECT id, "authorId", "videoKey", type, status
       FROM "Post"
       WHERE id = $1 AND "deletedAt" IS NULL`,
      [postId],
    );
    return result.rows[0] ?? null;
  }

  async markReady(
    postId: string,
    videoKey: string,
    thumbKey: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE "Post"
       SET status = 'READY', "videoKey" = $2, "thumbKey" = $3,
           "rejectionReason" = NULL, "updatedAt" = NOW()
       WHERE id = $1`,
      [postId, videoKey, thumbKey],
    );
  }

  async markRejected(postId: string, reason: string): Promise<void> {
    await this.pool.query(
      `UPDATE "Post"
       SET status = 'REJECTED', "rejectionReason" = $2,
           "videoKey" = NULL, "thumbKey" = NULL, "updatedAt" = NOW()
       WHERE id = $1`,
      [postId, reason],
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
