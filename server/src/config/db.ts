import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Singleton pattern — tránh tạo nhiều kết nối trong dev (HMR)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (env.isDev) {
  globalForPrisma.prisma = prisma;
}
