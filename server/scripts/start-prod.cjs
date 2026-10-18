#!/usr/bin/env node
/**
 * Production entrypoint (`npm start`):
 *   1. optionally writes the database CA certificate and enables verified TLS for Prisma
 *   2. applies pending migrations with `prisma migrate deploy` (never `db push`, never destructive)
 *   3. optionally seeds a brand-new database (SEED_ON_START=true; a no-op once a profile exists)
 *   4. starts the API
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config();

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`[start] ${message}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set.');

// 1. TLS to the managed database. Paste the provider's CA certificate (PEM) into DB_CA_CERT.
if (process.env.DB_CA_CERT && !/[?&]sslcert=/.test(process.env.DATABASE_URL)) {
  const certDir = path.join(root, '.certs');
  const certPath = path.join(certDir, 'db-ca.pem');
  fs.mkdirSync(certDir, { recursive: true });
  fs.writeFileSync(certPath, process.env.DB_CA_CERT.replace(/\\n/g, '\n'), { mode: 0o600 });
  const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL += `${sep}sslcert=${encodeURIComponent(certPath)}&sslaccept=strict`;
  console.log('[start] database CA certificate loaded; TLS verification enabled');
}

function run(label, command, args) {
  console.log(`[start] ${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
  if (result.status !== 0) fail(`${label} failed (exit ${result.status}).`);
}

// 2. Migrations
run('applying database migrations', 'npx', ['prisma', 'migrate', 'deploy']);

// 3. First-run seed (idempotent: does nothing when a profile already exists)
if (process.env.SEED_ON_START === 'true') run('seeding empty database', 'node', ['dist/seed/run.js']);

// 4. Start the API
require(path.join(root, 'dist', 'server.js'));
