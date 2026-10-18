import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient per process. Prisma maintains its own connection pool; tune it with
 * `?connection_limit=5` on DATABASE_URL (keep it small on free database tiers).
 *
 * Reads NODE_ENV directly (not ./env) so CLI scripts such as `admin:create` and the seed only need
 * DATABASE_URL rather than the full web-server configuration.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
});
