import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { createApp } from './app';
import { purgeExpiredSessions } from './services/sessionService';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, storage: env.STORAGE_DRIVER, email: env.EMAIL_PROVIDER, origins: env.frontendOrigins },
    'API listening',
  );
});

// Report database reachability at boot without blocking startup (free-tier databases may be asleep).
prisma
  .$queryRaw`SELECT 1`
  .then(() => logger.info('database connection OK'))
  .catch((err) => logger.error({ err: (err as Error).message }, 'database NOT reachable yet'));

// Hourly housekeeping: remove expired/idle sessions.
const purge = setInterval(() => {
  purgeExpiredSessions().catch((err) => logger.warn({ err: (err as Error).message }, 'session purge failed'));
}, 60 * 60 * 1000);
purge.unref();

async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandled promise rejection'));
