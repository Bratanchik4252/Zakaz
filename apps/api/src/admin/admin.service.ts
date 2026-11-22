import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Paginated, PostDto, ReportDto } from '@vp/shared';
import { RequestUser } from '../common/types';
import { PostsService } from '../posts/posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { BanUserDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly posts: PostsService,
  ) {}

  listReports(
    resolved: boolean | undefined,
    cursor?: string,
    limit?: number,
  ): Promise<Paginated<ReportDto>> {
    return this.reports.listForAdmin(resolved, cursor, limit);
  }

  resolveReport(
    reportId: string,
    resolved: boolean,
    user: RequestUser,
  ): Promise<{ ok: true }> {
    return this.reports.resolve(reportId, resolved, user);
  }

  listPending(cursor?: string): Promise<Paginated<PostDto>> {
    return this.posts.listPending(cursor);
  }

  async approvePost(
    postId: string,
    approved: boolean,
  ): Promise<{ ok: true; approved: boolean }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, deletedAt: true },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { approved },
    });

    return { ok: true, approved };
  }

  async banUser(
    actor: RequestUser,
    targetId: string,
    dto: BanUserDto,
  ): Promise<{ ok: true; banned: boolean }> {
    if (actor.id === targetId) {
      throw new BadRequestException('You cannot ban yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === Role.ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can moderate admins');
    }

    if (target.role === Role.MODERATOR && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can moderate moderators');
    }

    await this.prisma.user.update({
      where: { id: targetId },
      data: {
        banned: dto.banned,
        bannedAt: dto.banned ? new Date() : null,
        banReason: dto.banned ? dto.reason?.trim() || null : null,
      },
    });

    if (dto.banned) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: targetId },
      });
    }

    return { ok: true, banned: dto.banned };
  }
}
