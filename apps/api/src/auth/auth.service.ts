import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, User } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuthUser } from '@vp/shared';
import { GoogleProfilePayload } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

interface IssuedTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async loginWithGoogle(profile: GoogleProfilePayload): Promise<IssuedTokens> {
    const adminEmails = (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const shouldBeAdmin = adminEmails.includes(profile.email.toLowerCase());

    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            avatarUrl: user.avatarUrl ?? profile.avatarUrl,
          },
        });
      } else {
        user = await this.createUser(
          profile,
          shouldBeAdmin ? Role.ADMIN : Role.USER,
        );
      }
    }

    if (shouldBeAdmin && user.role !== Role.ADMIN) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: Role.ADMIN },
      });
    }

    if (user.banned) {
      throw new ForbiddenException('Account is banned');
    }

    return this.issueTokens(user);
  }

  async refresh(rawToken: string): Promise<IssuedTokens> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
      throw new UnauthorizedException('Refresh token expired');
    }

    if (record.user.banned) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: record.userId },
      });
      throw new ForbiddenException('Account is banned');
    }

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = this.refreshExpiry();

    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.refreshToken.deleteMany({
        where: { id: record.id },
      });
      if (deleted.count !== 1) {
        throw new UnauthorizedException('Refresh token already used');
      }
      await tx.refreshToken.deleteMany({
        where: { userId: record.userId, expiresAt: { lt: new Date() } },
      });
      await tx.refreshToken.create({
        data: {
          userId: record.userId,
          tokenHash: hashToken(refreshToken),
          expiresAt: refreshExpiresAt,
        },
      });
    });

    return {
      accessToken: await this.signAccessToken(record.user),
      expiresIn: this.accessTtl(),
      refreshToken,
      refreshExpiresAt,
      user: toAuthUser(record.user),
    };
  }

  async logout(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash: hashToken(rawToken) },
    });
  }

  private async issueTokens(user: User): Promise<IssuedTokens> {
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = this.refreshExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken: await this.signAccessToken(user),
      expiresIn: this.accessTtl(),
      refreshToken,
      refreshExpiresAt,
      user: toAuthUser(user),
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    return this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      username: user.username,
    });
  }

  private async createUser(
    profile: GoogleProfilePayload,
    role: Role,
  ): Promise<User> {
    const localPart = profile.email.split('@')[0] ?? '';
    const sanitized = localPart
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);
    const base = sanitized.length >= 3 ? sanitized : `user${sanitized}`;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const suffix =
        attempt === 0
          ? ''
          : String(Math.floor(Math.random() * 100_000)).padStart(5, '0');
      const username = `${base}${suffix}`.slice(0, 24);

      try {
        return await this.prisma.user.create({
          data: {
            email: profile.email,
            googleId: profile.googleId,
            username,
            avatarUrl: profile.avatarUrl,
            role,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = String(error.meta?.target ?? '');
          if (target.includes('username')) {
            continue;
          }
        }
        throw error;
      }
    }

    throw new Error('Failed to allocate a unique username');
  }

  private accessTtl(): number {
    const value = Number(this.config.get<string>('JWT_ACCESS_TTL') ?? 900);
    return Number.isFinite(value) && value > 0 ? value : 900;
  }

  private refreshExpiry(): Date {
    const days = Number(
      this.config.get<string>('JWT_REFRESH_TTL_DAYS') ?? 30,
    );
    const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
    return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    karma: user.karma,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
