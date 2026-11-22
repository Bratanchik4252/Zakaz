import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, TargetType } from '@prisma/client';
import { VoteResponse } from '@vp/shared';
import { computeHotScore } from '../common/hot-score';
import { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { VoteDto } from './dto/vote.dto';

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  async vote(user: RequestUser, dto: VoteDto): Promise<VoteResponse> {
    if (dto.targetType === TargetType.POST) {
      return this.votePost(user, dto);
    }
    return this.voteComment(user, dto);
  }

  private async votePost(
    user: RequestUser,
    dto: VoteDto,
  ): Promise<VoteResponse> {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.targetId },
      select: {
        id: true,
        authorId: true,
        score: true,
        createdAt: true,
        deletedAt: true,
        approved: true,
        status: true,
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (!post.approved || post.status !== PostStatus.READY) {
      throw new BadRequestException('Post is not published yet');
    }

    const existing = await this.prisma.vote.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: user.id,
          targetId: post.id,
          targetType: TargetType.POST,
        },
      },
    });

    if ((existing?.value ?? 0) === dto.value) {
      return { score: post.score, viewerVote: dto.value };
    }

    const delta = dto.value - (existing?.value ?? 0);

    const score = await this.prisma.$transaction(async (tx) => {
      if (dto.value === 0) {
        if (existing) {
          await tx.vote.delete({ where: { id: existing.id } });
        }
      } else if (existing) {
        await tx.vote.update({
          where: { id: existing.id },
          data: { value: dto.value },
        });
      } else {
        await tx.vote.create({
          data: {
            userId: user.id,
            targetId: post.id,
            targetType: TargetType.POST,
            value: dto.value,
          },
        });
      }

      const updated = await tx.post.update({
        where: { id: post.id },
        data: { score: { increment: delta } },
        select: { score: true },
      });

      await tx.post.update({
        where: { id: post.id },
        data: { hotScore: computeHotScore(updated.score, post.createdAt) },
      });

      if (delta !== 0) {
        await tx.user.update({
          where: { id: post.authorId },
          data: { karma: { increment: delta } },
        });
      }

      return updated.score;
    });

    return { score, viewerVote: dto.value };
  }

  private async voteComment(
    user: RequestUser,
    dto: VoteDto,
  ): Promise<VoteResponse> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: dto.targetId },
      select: {
        id: true,
        authorId: true,
        score: true,
        isDeleted: true,
        post: { select: { deletedAt: true } },
      },
    });

    if (!comment || comment.isDeleted || comment.post.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await this.prisma.vote.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: user.id,
          targetId: comment.id,
          targetType: TargetType.COMMENT,
        },
      },
    });

    if ((existing?.value ?? 0) === dto.value) {
      return { score: comment.score, viewerVote: dto.value };
    }

    const delta = dto.value - (existing?.value ?? 0);

    const score = await this.prisma.$transaction(async (tx) => {
      if (dto.value === 0) {
        if (existing) {
          await tx.vote.delete({ where: { id: existing.id } });
        }
      } else if (existing) {
        await tx.vote.update({
          where: { id: existing.id },
          data: { value: dto.value },
        });
      } else {
        await tx.vote.create({
          data: {
            userId: user.id,
            targetId: comment.id,
            targetType: TargetType.COMMENT,
            value: dto.value,
          },
        });
      }

      const updated = await tx.comment.update({
        where: { id: comment.id },
        data: { score: { increment: delta } },
        select: { score: true },
      });

      if (delta !== 0) {
        await tx.user.update({
          where: { id: comment.authorId },
          data: { karma: { increment: delta } },
        });
      }

      return updated.score;
    });

    return { score, viewerVote: dto.value };
  }
}
