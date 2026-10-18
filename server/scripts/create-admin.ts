/**
 * Creates the admin account (or resets its password with --reset).
 *
 *   npm run admin:create
 *   npm run admin:reset-password
 *
 * There is intentionally NO default admin and NO default password. The password is typed at a hidden
 * prompt (or supplied via ADMIN_USERNAME / ADMIN_PASSWORD for automation) and is never printed or logged.
 *
 * To create the admin in production, run this from your own machine with DATABASE_URL pointing at the
 * production database (see docs/DEPLOYMENT.md).
 */
import 'dotenv/config';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';
import { passwordSchema } from '../src/validators/auth';

const reset = process.argv.includes('--reset');

function prompt(question: string, hidden: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return reject(new Error('Not an interactive terminal. Set ADMIN_USERNAME and ADMIN_PASSWORD instead.'));
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1);
        } else {
          value += ch;
          if (!hidden) process.stdout.write(ch);
        }
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  if (process.env.DATABASE_URL === undefined) throw new Error('DATABASE_URL is not set.');

  const username = (process.env.ADMIN_USERNAME ?? (await prompt('Admin username: ', false))).trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
    throw new Error('Username must be 3–64 characters: letters, numbers, dot, underscore or hyphen.');
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await prompt('Password (min 12 characters, hidden): ', true);
    const confirm = await prompt('Repeat password: ', true);
    if (password !== confirm) throw new Error('Passwords do not match.');
  }
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(' '));

  const passwordHash = await hashPassword(password);
  const existing = await prisma.adminUser.findUnique({ where: { username } });

  if (reset) {
    if (!existing) throw new Error(`No admin named "${username}" exists.`);
    await prisma.$transaction([
      prisma.adminUser.update({ where: { id: existing.id }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } }),
      prisma.session.deleteMany({ where: { userId: existing.id } }),
    ]);
    console.log(`Password updated for "${username}". All existing sessions were signed out.`);
  } else {
    if (existing) throw new Error(`"${username}" already exists. Use "npm run admin:reset-password" to change its password.`);
    await prisma.adminUser.create({ data: { username, passwordHash } });
    console.log(`Admin "${username}" created. Sign in at /admin/login.`);
  }
}

main()
  .catch((err) => {
    console.error(`\nError: ${(err as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
