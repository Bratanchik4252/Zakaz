import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import {
  OAUTH_STATE_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from '@vp/shared';

export function isCookieSecure(config: ConfigService): boolean {
  const raw = config.get<string>('COOKIE_SECURE');
  if (raw !== undefined) {
    return raw === 'true';
  }
  return config.get<string>('NODE_ENV') === 'production';
}

function cookieDomain(config: ConfigService): string | undefined {
  const domain = config.get<string>('COOKIE_DOMAIN');
  return domain && domain.trim().length > 0 ? domain.trim() : undefined;
}

export function refreshCookieOptions(
  config: ConfigService,
  expires?: Date,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isCookieSecure(config),
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    domain: cookieDomain(config),
    ...(expires ? { expires } : {}),
  };
}

export function oauthStateCookieOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    secure: isCookieSecure(config),
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    domain: cookieDomain(config),
    maxAge: 10 * 60 * 1000,
  };
}

export function clearRefreshCookie(
  response: Response,
  config: ConfigService,
): void {
  response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(config));
}

export function clearOauthStateCookie(
  response: Response,
  config: ConfigService,
): void {
  response.clearCookie(OAUTH_STATE_COOKIE_NAME, oauthStateCookieOptions(config));
}
