import dotenv from 'dotenv';

dotenv.config();

// ----------------------------------------------------------------
// Type-safe environment variables
// Throw lỗi ngay khi thiếu biến bắt buộc (fail-fast pattern)
// ----------------------------------------------------------------
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[ENV] Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  // Server
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  isDev: process.env.NODE_ENV !== 'production',

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // JWT
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  // CORS
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',

  // Upload
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_MB ?? '5', 10) * 1024 * 1024,
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',

  // Email Config
  EMAIL_USER: requireEnv('EMAIL_USER'),
  EMAIL_PASS: requireEnv('EMAIL_PASS'),
} as const;
