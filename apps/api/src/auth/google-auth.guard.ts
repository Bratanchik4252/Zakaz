import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { OAUTH_STATE_COOKIE_NAME } from '@vp/shared';
import { oauthStateCookieOptions } from './cookies';

interface OAuthRequest extends Request {
  oauthState?: string;
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const state = randomBytes(24).toString('base64url');
    request.oauthState = state;
    response.cookie(
      OAUTH_STATE_COOKIE_NAME,
      state,
      oauthStateCookieOptions(this.config),
    );

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    return { state: request.oauthState };
  }
}
