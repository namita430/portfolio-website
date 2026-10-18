import 'dotenv/config';
import os from 'node:os';
import path from 'node:path';

/**
 * Points the process at a dedicated `*_test` database. The suite truncates tables, so this refuses to
 * run against anything whose name does not end in `_test` (protects dev and production data).
 */
export function applyTestEnv() {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL must be set in server/.env to run the tests.');
  const url = new URL(base);
  const dbName = 'portfolio_test';
  url.pathname = `/${dbName}`;
  if (!url.pathname.endsWith('_test')) throw new Error('Refusing to run tests against a non-test database.');

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: url.toString(),
    FRONTEND_ORIGINS: 'http://localhost:5173',
    SESSION_SECRET: 'test-secret-test-secret-test-secret-test-secret',
    COOKIE_SAMESITE: 'lax',
    STORAGE_DRIVER: 'local',
    STORAGE_PUBLIC_BASE_URL: 'http://localhost:4000/uploads',
    LOCAL_UPLOAD_DIR: path.join(os.tmpdir(), 'portfolio-test-uploads'),
    EMAIL_PROVIDER: 'none',
    TURNSTILE_SECRET_KEY: '',
    DB_CA_CERT: '',
    UPLOAD_MAX_IMAGE_MB: '2',
    UPLOAD_MAX_DOCUMENT_MB: '2',
  });
}
