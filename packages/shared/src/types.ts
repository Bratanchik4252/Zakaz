export type Role = 'USER' | 'MODERATOR' | 'ADMIN';
export type PostType = 'VIDEO' | 'TEXT';
export type PostStatus = 'PENDING' | 'READY' | 'REJECTED';
export type TargetType = 'POST' | 'COMMENT';
export type SubscriptionType = 'USER';
export type SortOption = (typeof SORT_OPTIONS)[number];
export type FeedOption = (typeof FEED_OPTIONS)[number];

import { SORT_OPTIONS, FEED_OPTIONS } from './constants';

export interface PublicUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  karma: number;
  role: Role;
  createdAt: string;
}

export interface AuthUser extends PublicUser {
  email: string;
}

export interface UserProfile extends PublicUser {
  subscriberCount: number;
  postCount: number;
  isSubscribed: boolean;
}

export interface PostDto {
  id: string;
  title: string;
  body: string | null;
  type: PostType;
  status: PostStatus;
  rejectionReason: string | null;
  approved: boolean;
  videoUrl: string | null;
  thumbUrl: string | null;
  score: number;
  views: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: PublicUser;
  tags: string[];
  viewerVote: number;
}

export interface CommentDto {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  isDeleted: boolean;
  isEdited: boolean;
  score: number;
  createdAt: string;
  updatedAt: string;
  author: PublicUser | null;
  viewerVote: number;
  replies: CommentDto[];
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface PresignResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
  expiresIn: number;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface VoteResponse {
  score: number;
  viewerVote: number;
}

export interface ReportDto {
  id: string;
  reason: string;
  resolved: boolean;
  createdAt: string;
  reporter: PublicUser;
  targetType: TargetType;
  targetId: string;
  targetExcerpt: string;
  targetAuthor: PublicUser | null;
  targetPostId: string | null;
  postId: string | null;
  commentId: string | null;
}
