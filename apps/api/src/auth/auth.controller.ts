import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { REFRESH_COOKIE_NAME } from '@vp/shared';
import { GoogleProfilePayload } from '../common/types';
import { AuthService } from './auth.service';
import {
  clearRefreshCookie,
  refreshCookieOptions,
} from './cookies';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleCallbackGuard } from './google-callback.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  googleAuth(): void {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async googleCallback(
    @Req() request: Request & { user?: GoogleProfilePayload },
    @Res() response: Response,
  ): Promise<void> {
    try {
      if (!request.user) {
        throw new Error('Missing Google profile');
      }

      const result = await this.auth.loginWithGoogle(request.user);
      response.cookie(
        REFRESH_COOKIE_NAME,
        result.refreshToken,
        refreshCookieOptions(this.config, result.refreshExpiresAt),
      );

      const params = new URLSearchParams({
        access_token: result.accessToken,
        expires_in: String(result.expiresIn),
        token_type: 'Bearer',
      });

      response.redirect(`${this.webUrl()}/auth/callback#${params.toString()}`);
    } catch (error) {
      const code =
        error instanceof ForbiddenException ? 'banned' : 'auth_failed';
      this.logger.warn(`Google login failed: ${String(error)}`);
      response.redirect(`${this.webUrl()}/auth/callback#error=${code}`);
    }
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rawToken = request.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;

    if (!rawToken) {
      throw new UnauthorizedException('No refresh token');
    }

    try {
      const result = await this.auth.refresh(rawToken);
      response.cookie(
        REFRESH_COOKIE_NAME,
        result.refreshToken,
        refreshCookieOptions(this.config, result.refreshExpiresAt),
      );

      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: result.user,
      };
    } catch (error) {
      clearRefreshCookie(response, this.config);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rawToken = request.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;

    if (rawToken) {
      await this.auth.logout(rawToken);
    }

    clearRefreshCookie(response, this.config);
    return { ok: true };
  }

  private webUrl(): string {
    const raw = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    return raw.split(',')[0].trim().replace(/\/+$/, '');
  }
}
