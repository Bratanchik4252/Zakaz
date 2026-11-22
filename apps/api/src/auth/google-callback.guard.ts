import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { OAUTH_STATE_COOKIE_NAME } from '@vp/shared';
import { clearOauthStateCookie } from './cookies';

@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const expected = request.cookies?.[OAUTH_STATE_COOKIE_NAME] as
      | string
      | undefined;
    const actual = request.query.state;
    clearOauthStateCookie(response, this.config);

    if (!expected || typeof actual !== 'string' || actual !== expected) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    return (await super.canActivate(context)) as boolean;
  }
}
