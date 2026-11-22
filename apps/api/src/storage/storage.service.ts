import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_VIDEO_SIZE_BYTES,
} from '@vp/shared';

const MIME_TO_EXTENSION: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/x-msvideo': 'avi',
  'video/mpeg': 'mpeg',
  'video/x-m4v': 'm4v',
};

const VIDEO_KEY_PATTERN =
  /^videos\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.(mp4|webm|mov|mkv|avi|mpeg|mpg|m4v)$/;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string | null;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    this.publicBaseUrl =
      this.config.get<string>('PUBLIC_S3_BASE_URL')?.replace(/\/+$/, '') || null;

    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
      endpoint: endpoint || undefined,
      forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async getUrl(key: string | null | undefined): Promise<string | null> {
    if (!key) {
      return null;
    }
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${key}`;
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 },
    );
  }

  async createUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<{ url: string; fields: Record<string, string>; key: string }> {
    if (!ALLOWED_VIDEO_MIME_TYPES.includes(contentType as never)) {
      throw new BadRequestException('Unsupported video format');
    }

    const extension = MIME_TO_EXTENSION[contentType];
    if (!extension) {
      throw new BadRequestException('Unsupported video format');
    }

    const key = `videos/${userId}/${randomUUID()}.${extension}`;

    const presigned = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Expires: 600,
      Fields: {
        'Content-Type': contentType,
      },
      Conditions: [
        ['content-length-range', 1, MAX_VIDEO_SIZE_BYTES],
        ['eq', '$Content-Type', contentType],
        ['eq', '$key', key],
      ],
    });

    return {
      url: presigned.url,
      fields: presigned.fields as Record<string, string>,
      key,
    };
  }

  async verifyUploadedVideo(key: string, userId: string): Promise<number> {
    if (!VIDEO_KEY_PATTERN.test(key) || !key.startsWith(`videos/${userId}/`)) {
      throw new BadRequestException('Invalid video key');
    }

    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const size = head.ContentLength ?? 0;
      if (size <= 0) {
        throw new BadRequestException('Uploaded file is empty');
      }
      if (size > MAX_VIDEO_SIZE_BYTES) {
        throw new BadRequestException('Uploaded file is too large');
      }
      return size;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException('Uploaded video was not found in storage');
    }
  }

  async deleteObject(key: string | null | undefined): Promise<void> {
    if (!key) {
      return;
    }
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      this.logger.warn(`Failed to delete S3 object ${key}: ${String(error)}`);
    }
  }
}
