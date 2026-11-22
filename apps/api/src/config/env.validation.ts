const REQUIRED_ENV = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'WEB_URL',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENV.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const secret = String(config.JWT_ACCESS_SECRET);
  if (secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
  }

  return {
    ...config,
    JWT_ACCESS_TTL: config.JWT_ACCESS_TTL ?? '900',
    JWT_REFRESH_TTL_DAYS: config.JWT_REFRESH_TTL_DAYS ?? '30',
    S3_REGION: config.S3_REGION ?? 'us-east-1',
    S3_FORCE_PATH_STYLE: config.S3_FORCE_PATH_STYLE ?? 'false',
    PREMODERATION: config.PREMODERATION ?? 'false',
  };
}
