export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_VIDEO_DURATION_SECONDS = 120; // 2 minutes

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/x-msvideo',
  'video/mpeg',
  'video/x-m4v',
] as const;

export const ALLOWED_VIDEO_EXTENSIONS = [
  'mp4',
  'webm',
  'mov',
  'mkv',
  'avi',
  'mpeg',
  'mpg',
  'm4v',
] as const;

export const MAX_TITLE_LENGTH = 200;
export const MIN_TITLE_LENGTH = 3;
export const MAX_POST_BODY_LENGTH = 10_000;
export const MAX_COMMENT_LENGTH = 5_000;
export const MAX_REPORT_REASON_LENGTH = 500;
export const MIN_REPORT_REASON_LENGTH = 3;
export const MAX_TAGS_PER_POST = 5;
export const MAX_TAG_LENGTH = 24;
export const MAX_SEARCH_QUERY_LENGTH = 100;

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 50;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/auth';
export const OAUTH_STATE_COOKIE_NAME = 'oauth_state';

export const TRANSCODE_QUEUE_NAME = 'transcode';

export const SORT_OPTIONS = ['new', 'top', 'hot'] as const;
export const FEED_OPTIONS = ['all', 'subs'] as const;

export const DELETED_COMMENT_PLACEHOLDER = '[deleted]';
