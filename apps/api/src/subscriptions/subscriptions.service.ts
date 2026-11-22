import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PublicUser } from '@vp/shared';
import { publicUserSelect, toPublicUser } from '../common/serializers';
import { RequestUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: RequestUser,
    dto: CreateSubscriptionDto,
  ): Promise<{ subscribed: true }> {
    if (dto.targetType !== 'USER') {
      throw new BadRequestException('Only user subscriptions are supported');
    }

    if (dto.targetId === user.id) {
      throw new BadRequestException('You cannot subscribe to yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetId },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.subscription.upsert({
      where: {
        userId_targetId_targetType: {
          userId: user.id,
          targetId: dto.targetId,
          targetType: 'USER',
        },
      },
      create: {
        userId: user.id,
        targetId: dto.targetId,
        targetType: 'USER',
      },
      update: {},
    });

    return { subscribed: true };
  }

  async remove(
    user: RequestUser,
    targetId: string,
  ): Promise<{ subscribed: false }> {
    await this.prisma.subscription.deleteMany({
      where: { userId: user.id, targetId, targetType: 'USER' },
    });
    return { subscribed: false };
  }

  async list(user: RequestUser): Promise<{ items: PublicUser[] }> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId: user.id, targetType: 'USER' },
      orderBy: { createdAt: 'desc' },
      select: { targetId: true },
    });

    if (subscriptions.length === 0) {
      return { items: [] };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: subscriptions.map((item) => item.targetId) } },
      select: publicUserSelect,
    });

    const byId = new Map(users.map((item) => [item.id, item]));
    const items = subscriptions
      .map((item) => byId.get(item.targetId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map(toPublicUser);

    return { items };
  }
}
