import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../types';
import { extractBearerToken, toRequestUser } from './jwt-auth.guard';

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser | null }>();

    const token = extractBearerToken(request);
    if (!token) {
      request.user = undefined;
      return true;
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      if (!payload.sub) {
        request.user = undefined;
        return true;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      request.user =
        user && !user.banned ? toRequestUser(user) : undefined;
    } catch {
      request.user = undefined;
    }

    return true;
  }
}
