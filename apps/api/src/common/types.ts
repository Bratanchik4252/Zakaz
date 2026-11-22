import { Role } from '@prisma/client';

export interface RequestUser {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  karma: number;
  role: Role;
  createdAt: Date;
}

export interface GoogleProfilePayload {
  googleId: string;
  email: string;
  avatarUrl: string | null;
}
