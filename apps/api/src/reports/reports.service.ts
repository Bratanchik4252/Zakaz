import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TargetType } from '@prisma/client';
import { Paginated, ReportDto } from '@vp/shared';
import { decodeCursor, encodeCursor } from '../common/cursor';
import { publicUserSelect, toPublicUser } from '../common/serializers';
import { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

interface ReportRecord {
  id: string;
  reason: string;
  resolved: boolean;
  createdAt: Date;
  postId: string | null;
  commentId: string | null;
  reporter: {
    id: string;
    username: string;
    avatarUrl: string | null;
    karma: number;
    role: Prisma.UserGetPayload<object>['role'];
    createdAt: Date;
  };
  post: {
    id: string;
    title: string;
    body: string | null;
    author: {
      id: string;
      username: string;
      avatarUrl: string | null;
      karma: number;
      role: Prisma.UserGetPayload<object>['role'];
      createdAt: Date;
    };
  } | null;
  comment: {
    id: string;
    body: string;
    isDeleted: boolean;
    postId: string;
    author: {
      id: string;
      username: string;
      avatarUrl: string | null;
      karma: number;
      role: Prisma.UserGetPayload<object>['role'];
      createdAt: Date;
    };
    post: { id: string; title: string } | null;
  } | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: RequestUser,
    dto: CreateReportDto,
  ): Promise<{ id: string }> {
    if (Boolean(dto.postId) === Boolean(dto.commentId)) {
      throw new BadRequestException(
        'Provide exactly one of postId or commentId',
      );
    }

    const reason = dto.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestException('Report reason is too short');
    }

    if (dto.postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: dto.postId },
        select: { id: true, deletedAt: true },
      });
      if (!post || post.deletedAt) {
        throw new NotFoundException('Post not found');
      }
    } else if (dto.commentId) {
      const comment = await this.prisma.comment.findUnique({
        where: { id: dto.commentId },
        select: { id: true, isDeleted: true },
      });
      if (!comment || comment.isDeleted) {
        throw new NotFoundException('Comment not found');
      }
    }

    const duplicate = await this.prisma.report.findFirst({
      where: {
        reporterId: user.id,
        resolved: false,
        postId: dto.postId ?? null,
        commentId: dto.commentId ?? null,
      },
      select: { id: true },
    });

    if (duplicate) {
      return { id: duplicate.id };
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId: user.id,
        postId: dto.postId ?? null,
        commentId: dto.commentId ?? null,
        reason,
      },
      select: { id: true },
    });

    return { id: report.id };
  }

  async listForAdmin(
    resolved: boolean | undefined,
    cursorRaw: string | undefined,
    limit = 20,
  ): Promise<Paginated<ReportDto>> {
    const safeLimit = Math.min(limit, 50);
    const where: Prisma.ReportWhereInput = {};
    if (resolved !== undefined) {
      where.resolved = resolved;
    }

    const cursor = decodeCursor<{ createdAt: string; id: string }>(cursorRaw);
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

    const reports = await this.prisma.report.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: safeLimit + 1,
      include: {
        reporter: { select: publicUserSelect },
        post: {
          select: {
            id: true,
            title: true,
            body: true,
            author: { select: publicUserSelect },
          },
        },
        comment: {
          select: {
            id: true,
            body: true,
            isDeleted: true,
            postId: true,
            author: { select: publicUserSelect },
            post: { select: { id: true, title: true } },
          },
        },
      },
    });

    const hasMore = reports.length > safeLimit;
    const page = hasMore ? reports.slice(0, safeLimit) : reports;
    const last = page[page.length - 1];

    return {
      items: page.map((report) => this.serialize(report)),
      nextCursor:
        hasMore && last
          ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async resolve(
    reportId: string,
    resolved: boolean,
    resolver: RequestUser,
  ): Promise<{ ok: true }> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        resolved,
        resolvedById: resolved ? resolver.id : null,
        resolvedAt: resolved ? new Date() : null,
      },
    });

    return { ok: true };
  }

  private serialize(report: ReportRecord): ReportDto {
    const targetType = report.postId ? TargetType.POST : TargetType.COMMENT;
    const targetId = report.postId ?? report.commentId ?? '';

    let targetExcerpt = '[deleted]';
    let targetAuthor = null as ReportDto['targetAuthor'];

    if (report.post) {
      targetExcerpt = truncate(report.post.title, 140);
      targetAuthor = toPublicUser(report.post.author);
    } else if (report.comment) {
      targetExcerpt = report.comment.isDeleted
        ? '[deleted]'
        : truncate(report.comment.body, 140);
      targetAuthor = toPublicUser(report.comment.author);
    }

    return {
      id: report.id,
      reason: report.reason,
      resolved: report.resolved,
      createdAt: report.createdAt.toISOString(),
      reporter: toPublicUser(report.reporter),
      targetType,
      targetId,
      targetExcerpt,
      targetAuthor,
      targetPostId:
        report.postId ?? report.comment?.post?.id ?? null,
      postId: report.postId,
      commentId: report.commentId,
    };
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
