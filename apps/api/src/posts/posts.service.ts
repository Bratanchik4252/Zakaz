import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostStatus, PostType, Prisma, Role } from '@prisma/client';
import {
  MAX_TAGS_PER_POST,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  Paginated,
  PostDto,
  SortOption,
} from '@vp/shared';
import { decodeCursor, encodeCursor } from '../common/cursor';
import { computeHotScore } from '../common/hot-score';
import { publicUserSelect, toPublicUser } from '../common/serializers';
import { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';

interface PostRecord {
  id: string;
  title: string;
  body: string | null;
  type: PostType;
  status: PostStatus;
  rejectionReason: string | null;
  approved: boolean;
  videoKey: string | null;
  thumbKey: string | null;
  score: number;
  hotScore: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
    karma: number;
    role: Role;
    createdAt: Date;
  };
  tags: { tag: { name: string } }[];
  _count: { comments: number };
}

interface CursorPayload {
  v: number | string;
  id: string;
}

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
  ) {}

  async create(user: RequestUser, dto: CreatePostDto): Promise<PostDto> {
    const tags = this.normalizeTags(dto.tags);
    const body = dto.body?.trim() || null;
    const premoderation = this.config.get<string>('PREMODERATION') === 'true';

    if (dto.type === PostType.VIDEO) {
      if (!dto.videoKey) {
        throw new BadRequestException('videoKey is required for video posts');
      }
      await this.storage.verifyUploadedVideo(dto.videoKey, user.id);
    } else {
      if (!body) {
        throw new BadRequestException('Text posts require a body');
      }
      if (dto.videoKey) {
        throw new BadRequestException('videoKey is not allowed for text posts');
      }
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: user.id,
        title: dto.title.trim(),
        body,
        type: dto.type,
        videoKey: dto.type === PostType.VIDEO ? dto.videoKey : null,
        status:
          dto.type === PostType.VIDEO
            ? PostStatus.PENDING
            : PostStatus.READY,
        approved: !premoderation,
        hotScore: 0,
        tags:
          tags.length > 0
            ? {
                create: tags.map((name) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name },
                      create: { name },
                    },
                  },
                })),
              }
            : undefined,
      },
      include: this.includeFor(),
    });

    if (post.type === PostType.VIDEO) {
      try {
        await this.queue.enqueueTranscode(post.id);
      } catch (error) {
        this.logger.error(
          `Failed to enqueue transcode job for ${post.id}: ${String(error)}`,
        );
        const rejected = await this.prisma.post.update({
          where: { id: post.id },
          data: {
            status: PostStatus.REJECTED,
            rejectionReason: 'Transcoding service is unavailable',
          },
          include: this.includeFor(),
        });
        return this.serialize(rejected, 0);
      }
    }

    return this.serialize(post, 0);
  }

  async list(
    dto: ListPostsDto,
    viewer: RequestUser | null,
  ): Promise<Paginated<PostDto>> {
    const limit = Math.min(dto.limit ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
    const sort: SortOption = dto.sort ?? 'hot';
    const where: Prisma.PostWhereInput = {
      deletedAt: null,
      approved: true,
      status: PostStatus.READY,
    };
    const and: Prisma.PostWhereInput[] = [];

    if (dto.q?.trim()) {
      const q = dto.q.trim();
      and.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { body: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (dto.authorId) {
      and.push({ authorId: dto.authorId });
    }

    if (dto.feed === 'subs') {
      if (!viewer) {
        throw new UnauthorizedException(
          'Authentication is required for the subscriptions feed',
        );
      }
      const subscriptions = await this.prisma.subscription.findMany({
        where: { userId: viewer.id, targetType: 'USER' },
        select: { targetId: true },
      });
      if (subscriptions.length === 0) {
        return { items: [], nextCursor: null };
      }
      and.push({
        authorId: { in: subscriptions.map((item) => item.targetId) },
      });
    }

    for (const tag of this.parseTagFilter(dto.tags)) {
      and.push({ tags: { some: { tag: { name: tag } } } });
    }

    const cursor = decodeCursor<CursorPayload>(dto.cursor);
    if (cursor) {
      and.push(this.cursorFilter(sort, cursor));
    }

    if (and.length > 0) {
      where.AND = and;
    }

    const posts = await this.prisma.post.findMany({
      where,
      orderBy: this.orderBy(sort),
      take: limit + 1,
      include: this.includeFor(),
    });

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    const votes = viewer
      ? await this.prisma.vote.findMany({
          where: {
            userId: viewer.id,
            targetType: 'POST',
            targetId: { in: page.map((post) => post.id) },
          },
          select: { targetId: true, value: true },
        })
      : [];
    const voteMap = new Map(
      votes.map((vote) => [vote.targetId, vote.value]),
    );
    const items = await Promise.all(
      page.map((post) => this.serialize(post, voteMap.get(post.id) ?? 0)),
    );
    const last = page[page.length - 1];

    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeCursor({
              v: this.cursorValue(sort, last),
              id: last.id,
            })
          : null,
    };
  }

  async getById(
    id: string,
    viewer: RequestUser | null,
  ): Promise<PostDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: this.includeFor(),
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const isOwner = viewer?.id === post.authorId;
    const isStaff =
      viewer?.role === Role.MODERATOR || viewer?.role === Role.ADMIN;
    const isPublished =
      post.approved && post.status === PostStatus.READY;

    if (!isPublished && !isOwner && !isStaff) {
      throw new NotFoundException('Post not found');
    }

    if (isPublished) {
      await this.prisma.post.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
      post.views += 1;
    }

    const vote = viewer
      ? await this.prisma.vote.findUnique({
          where: {
            userId_targetId_targetType: {
              userId: viewer.id,
              targetId: id,
              targetType: 'POST',
            },
          },
          select: { value: true },
        })
      : null;

    return this.serialize(post, vote?.value ?? 0);
  }

  async remove(id: string, user: RequestUser): Promise<{ ok: true }> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const isOwner = post.authorId === user.id;
    const isStaff = user.role !== Role.USER;
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You cannot delete this post');
    }

    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await Promise.all([
      this.storage.deleteObject(post.videoKey),
      this.storage.deleteObject(post.thumbKey),
    ]);

    return { ok: true };
  }

  async listPending(
    cursorRaw: string | undefined,
    limit = PAGE_SIZE_DEFAULT,
  ): Promise<Paginated<PostDto>> {
    const safeLimit = Math.min(limit, PAGE_SIZE_MAX);
    const cursor = decodeCursor<{ createdAt: string; id: string }>(cursorRaw);
    const where: Prisma.PostWhereInput = {
      approved: false,
      deletedAt: null,
    };

    if (cursor) {
      const createdAt = new Date(cursor.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new BadRequestException('Invalid cursor');
      }
      where.OR = [
        { createdAt: { gt: createdAt } },
        { createdAt, id: { gt: cursor.id } },
      ];
    }

    const posts = await this.prisma.post.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: safeLimit + 1,
      include: this.includeFor(),
    });

    const hasMore = posts.length > safeLimit;
    const page = hasMore ? posts.slice(0, safeLimit) : posts;
    const items = await Promise.all(
      page.map((post) => this.serialize(post, 0)),
    );
    const last = page[page.length - 1];

    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async serialize(post: PostRecord, viewerVote = 0): Promise<PostDto> {
    const [videoUrl, thumbUrl] = await Promise.all([
      this.storage.getUrl(post.videoKey),
      this.storage.getUrl(post.thumbKey),
    ]);

    return {
      id: post.id,
      title: post.title,
      body: post.body,
      type: post.type,
      status: post.status,
      rejectionReason: post.rejectionReason,
      approved: post.approved,
      videoUrl,
      thumbUrl,
      score: post.score,
      views: post.views,
      commentCount: post._count.comments,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      author: toPublicUser(post.author),
      tags: post.tags.map((item) => item.tag.name),
      viewerVote,
    };
  }

  private includeFor() {
    return {
      author: { select: publicUserSelect },
      tags: { include: { tag: { select: { name: true } } } },
      _count: {
        select: { comments: { where: { isDeleted: false } } },
      },
    } satisfies Prisma.PostInclude;
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags || tags.length === 0) {
      return [];
    }

    const normalized: string[] = [];
    for (const raw of tags) {
      const name = raw.trim().toLowerCase().replace(/^#+/, '');
      if (!name) {
        continue;
      }
      if (!/^[\p{L}\p{N}_-]{1,24}$/u.test(name)) {
        throw new BadRequestException(`Invalid tag: ${raw}`);
      }
      if (!normalized.includes(name)) {
        normalized.push(name);
      }
    }

    if (normalized.length > MAX_TAGS_PER_POST) {
      throw new BadRequestException(
        `A post can have at most ${MAX_TAGS_PER_POST} tags`,
      );
    }

    return normalized;
  }

  private parseTagFilter(raw?: string): string[] {
    if (!raw?.trim()) {
      return [];
    }

    const names = raw
      .split(',')
      .map((tag) => tag.trim().toLowerCase().replace(/^#+/, ''))
      .filter(Boolean)
      .slice(0, 10);

    for (const name of names) {
      if (!/^[\p{L}\p{N}_-]{1,24}$/u.test(name)) {
        throw new BadRequestException(`Invalid tag filter: ${name}`);
      }
    }

    return names;
  }

  private orderBy(
    sort: SortOption,
  ): Prisma.PostOrderByWithRelationInput[] {
    if (sort === 'new') {
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
    if (sort === 'top') {
      return [{ score: 'desc' }, { id: 'desc' }];
    }
    return [{ hotScore: 'desc' }, { id: 'desc' }];
  }

  private cursorFilter(
    sort: SortOption,
    cursor: CursorPayload,
  ): Prisma.PostWhereInput {
    if (typeof cursor.id !== 'string' || !cursor.id) {
      throw new BadRequestException('Invalid cursor');
    }

    if (sort === 'new') {
      const createdAt = new Date(String(cursor.v));
      if (Number.isNaN(createdAt.getTime())) {
        throw new BadRequestException('Invalid cursor');
      }
      return {
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: cursor.id } },
        ],
      };
    }

    const value = Number(cursor.v);
    if (!Number.isFinite(value)) {
      throw new BadRequestException('Invalid cursor');
    }

    if (sort === 'top') {
      return {
        OR: [
          { score: { lt: value } },
          { score: value, id: { lt: cursor.id } },
        ],
      };
    }

    return {
      OR: [
        { hotScore: { lt: value } },
        { hotScore: value, id: { lt: cursor.id } },
      ],
    };
  }

  private cursorValue(sort: SortOption, post: PostRecord): string | number {
    if (sort === 'new') {
      return post.createdAt.toISOString();
    }
    if (sort === 'top') {
      return post.score;
    }
    return post.hotScore;
  }
}
