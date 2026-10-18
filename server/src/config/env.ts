import 'dotenv/config';
import { z } from 'zod';

/** Treat empty strings (from `KEY=` lines in .env files) as "not set". */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

const booleanString = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_CA_CERT: optionalString,

  FRONTEND_ORIGINS: z.string().min(1, 'FRONTEND_ORIGINS is required'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(168),
  SESSION_IDLE_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(24),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_PUBLIC_BASE_URL: z.string().min(1, 'STORAGE_PUBLIC_BASE_URL is required'),
  S3_ENDPOINT: optionalString,
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_FORCE_PATH_STYLE: booleanString,
  UPLOAD_MAX_IMAGE_MB: z.coerce.number().positive().max(25).default(8),
  UPLOAD_MAX_DOCUMENT_MB: z.coerce.number().positive().max(25).default(10),

  EMAIL_PROVIDER: z.enum(['none', 'resend', 'smtp']).default('none'),
  EMAIL_FROM: optionalString,
  CONTACT_NOTIFY_TO: optionalString,
  RESEND_API_KEY: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: booleanString,
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
  process.exit(1);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === 'production';

const origins = raw.FRONTEND_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .map((o) => {
    try {
      return new URL(o).origin;
    } catch {
      console.error(`Invalid origin in FRONTEND_ORIGINS: "${o}"`);
      process.exit(1);
    }
  });

const problems: string[] = [];
if (isProd) {
  if (/replace-with|change[-_]?me|example/i.test(raw.SESSION_SECRET)) {
    problems.push('SESSION_SECRET still looks like a placeholder.');
  }
  if (raw.STORAGE_DRIVER !== 's3') {
    problems.push('STORAGE_DRIVER must be "s3" in production (the server disk is ephemeral).');
  }
  if (origins.some((o) => !o.startsWith('https://'))) {
    problems.push('Every FRONTEND_ORIGINS entry must use https:// in production.');
  }
  if (!raw.STORAGE_PUBLIC_BASE_URL.startsWith('https://')) {
    problems.push('STORAGE_PUBLIC_BASE_URL must use https:// in production.');
  }
}
if (raw.STORAGE_DRIVER === 's3') {
  for (const key of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
    if (!raw[key]) problems.push(`${key} is required when STORAGE_DRIVER=s3.`);
  }
}
if (raw.EMAIL_PROVIDER !== 'none') {
  if (!raw.EMAIL_FROM || !raw.CONTACT_NOTIFY_TO) {
    problems.push('EMAIL_FROM and CONTACT_NOTIFY_TO are required when EMAIL_PROVIDER is not "none".');
  }
  if (raw.EMAIL_PROVIDER === 'resend' && !raw.RESEND_API_KEY) problems.push('RESEND_API_KEY is required.');
  if (raw.EMAIL_PROVIDER === 'smtp' && (!raw.SMTP_HOST || !raw.SMTP_USER || !raw.SMTP_PASS)) {
    problems.push('SMTP_HOST, SMTP_USER and SMTP_PASS are required when EMAIL_PROVIDER=smtp.');
  }
}
if (raw.COOKIE_SAMESITE === 'none' && isProd && origins.every((o) => !o.startsWith('https://'))) {
  problems.push('COOKIE_SAMESITE=none requires HTTPS origins.');
}
if (problems.length) {
  console.error(`Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}

export const env = {
  ...raw,
  isProd,
  isTest: raw.NODE_ENV === 'test',
  frontendOrigins: origins,
  uploadMaxImageBytes: Math.floor(raw.UPLOAD_MAX_IMAGE_MB * 1024 * 1024),
  uploadMaxDocumentBytes: Math.floor(raw.UPLOAD_MAX_DOCUMENT_MB * 1024 * 1024),
  /** `__Host-` prefix forces Secure + Path=/ + host-only; only usable over HTTPS. */
  sessionCookieName: isProd ? '__Host-sid' : 'sid',
  /** Cookie must be Secure whenever it is SameSite=None or the app runs in production. */
  cookieSecure: isProd || raw.COOKIE_SAMESITE === 'none',
};

export type Env = typeof env;
