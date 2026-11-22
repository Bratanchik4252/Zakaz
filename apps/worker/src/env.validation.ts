const REQUIRED_ENV = [
  'DATABASE_URL',
  'REDIS_URL',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
] as const;

export function validateWorkerEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENV.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    ...config,
    S3_REGION: config.S3_REGION ?? 'us-east-1',
    S3_FORCE_PATH_STYLE: config.S3_FORCE_PATH_STYLE ?? 'false',
    WORKER_CONCURRENCY: config.WORKER_CONCURRENCY ?? '1',
  };
}
