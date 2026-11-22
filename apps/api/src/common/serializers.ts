import { Prisma, Role } from '@prisma/client';
import { PublicUser } from '@vp/shared';

export const publicUserSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  karma: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export interface PublicUserRecord {
  id: string;
  username: string;
  avatarUrl: string | null;
  karma: number;
  role: Role;
  createdAt: Date;
}

export function toPublicUser(user: PublicUserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    karma: user.karma,
    role: user.role as PublicUser['role'],
    createdAt: user.createdAt.toISOString(),
  };
}
