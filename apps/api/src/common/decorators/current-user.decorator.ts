import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | null => {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser | null }>();
    return request.user ?? null;
  },
);
