import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, UserProfile } from '@vp/shared';
import { publicUserSelect, toPublicUser } from '../common/serializers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...publicUserSelect, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { ...toPublicUser(user), email: user.email };
  }

  async getProfile(
    userId: string,
    viewerId: string | null,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [subscriberCount, postCount, subscription] = await Promise.all([
      this.prisma.subscription.count({
        where: { targetId: userId, targetType: 'USER' },
      }),
      this.prisma.post.count({
        where: {
          authorId: userId,
          deletedAt: null,
          approved: true,
          status: 'READY',
        },
      }),
      viewerId
        ? this.prisma.subscription.findUnique({
            where: {
              userId_targetId_targetType: {
                userId: viewerId,
                targetId: userId,
                targetType: 'USER',
              },
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      ...toPublicUser(user),
      subscriberCount,
      postCount,
      isSubscribed: Boolean(subscription),
    };
  }
}
