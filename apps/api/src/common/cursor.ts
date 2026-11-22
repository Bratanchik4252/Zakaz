import { BadRequestException } from '@nestjs/common';

export function encodeCursor(payload: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor<T>(cursor?: string | null): T | null {
  if (!cursor) {
    return null;
  }
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid cursor');
    }
    return parsed as T;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}
