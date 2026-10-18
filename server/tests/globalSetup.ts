import { execSync } from 'node:child_process';
import { applyTestEnv } from './testEnv';

/** Applies the real migrations to the test database once, so the tests exercise the production schema. */
export default function setup() {
  applyTestEnv();
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env, cwd: process.cwd() });
}
