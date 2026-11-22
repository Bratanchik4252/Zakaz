import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, Prisma, Role } from '@prisma/client';
import { CommentDto, DELETED_COMMENT_PLACEHOLDER } from '@vp/shared';
import { publicUserSelect, toPublicUser } from '../common/serializers';
import { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

interface CommentRecord {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  score: number;
  isDeleted: boolean;
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
}

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    postId: string,
    viewer: RequestUser | null,
  ): Promise<{ items: CommentDto[] }> {
    await this.assertPostVisible(postId, viewer);

    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: publicUserSelect } },
    });

    const votes = viewer
      ? await this.prisma.vote.findMany({
          where: {
            userId: viewer.id,
            targetType: 'COMMENT',
            targetId: { in: comments.map((comment) => comment.id) },
          },
          select: { targetId: true, value: true },
        })
      : [];
    const voteMap = new Map(
      votes.map((vote) => [vote.targetId, vote.value]),
    );

    const nodes = new Map<string, CommentDto>();
    for (const comment of comments) {
      nodes.set(
        comment.id,
        this.serialize(comment, voteMap.get(comment.id) ?? 0),
      );
    }

    const roots: CommentDto[] = [];
    for (const comment of comments) {
      const node = nodes.get(comment.id);
      if (!node) {
        continue;
      }
      if (comment.parentId && nodes.has(comment.parentId)) {
        nodes.get(comment.parentId)?.replies.push(node);
      } else {
        roots.push(node);
      }
    }

    const sorter = (a: CommentDto, b: CommentDto) =>
      b.score - a.score ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    roots.sort(sorter);
    for (const node of nodes.values()) {
      node.replies.sort(sorter);
    }

    return { items: roots };
  }

  async create(
    postId: string,
    user: RequestUser,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        status: true,
        approved: true,
        deletedAt: true,
      },
    });

    if (
      !post ||
      post.deletedAt ||
      !post.approved ||
      post.status !== PostStatus.READY
    ) {
      throw new BadRequestException('Post is not available for comments');
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, postId: true, isDeleted: true },
      });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Parent comment not found');
      }
      if (parent.isDeleted) {
        throw new BadRequestException(
          'Cannot reply to a deleted comment',
        );
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId: user.id,
        parentId: dto.parentId ?? null,
        body: dto.body.trim(),
      },
      include: { author: { select: publicUserSelect } },
    });

    return this.serialize(comment, 0);
  }

  async update(
    commentId: string,
    user: RequestUser,
    dto: UpdateCommentDto,
  ): Promise<CommentDto> {
    const existing = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, isDeleted: true },
    });

    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    if (existing.authorId !== user.id) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body.trim() },
      include: { author: { select: publicUserSelect } },
    });

    const vote = await this.prisma.vote.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: user.id,
          targetId: commentId,
          targetType: 'COMMENT',
        },
      },
      select: { value: true },
    });

    return this.serialize(updated, vote?.value ?? 0);
  }

  async remove(
    commentId: string,
    user: RequestUser,
  ): Promise<{ ok: true }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, isDeleted: true },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    const isOwner = comment.authorId === user.id;
    const isStaff = user.role !== Role.USER;
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You cannot delete this comment');
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        body: DELETED_COMMENT_PLACEHOLDER,
      },
    });

    return { ok: true };
  }

  private async assertPostVisible(
    postId: string,
    viewer: RequestUser | null,
  ): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        status: true,
        approved: true,
        deletedAt: true,
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const isPublished =
      post.approved && post.status === PostStatus.READY;
    const isOwner = viewer?.id === post.authorId;
    const isStaff =
      viewer?.role === Role.MODERATOR || viewer?.role === Role.ADMIN;

    if (!isPublished && !isOwner && !isStaff) {
      throw new NotFoundException('Post not found');
    }
  }

  private serialize(comment: CommentRecord, viewerVote = 0): CommentDto {
    return {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      body: comment.isDeleted
        ? DELETED_COMMENT_PLACEHOLDER
        : comment.body,
      isDeleted: comment.isDeleted,
      isEdited:
        !comment.isDeleted &&
        comment.updatedAt.getTime() - comment.createdAt.getTime() > 1000,
      score: comment.score,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: comment.isDeleted ? null : toPublicUser(comment.author),
      viewerVote,
      replies: [],
    };
  }
}
