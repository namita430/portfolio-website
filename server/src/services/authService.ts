import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import { createSession, destroyOtherSessions } from './sessionService';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;

// Verified against when the username does not exist, so response time doesn't reveal valid usernames.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('not-a-real-password-' + Date.now()));

const normalise = (username: string) => username.trim().toLowerCase();

export async function login(username: string, password: string, meta: { ip?: string; userAgent?: string }) {
  const user = await prisma.adminUser.findUnique({ where: { username: normalise(username) } });
  const locked = !!user?.lockedUntil && user.lockedUntil.getTime() > Date.now();
  const candidateHash = user && !locked ? user.passwordHash : await getDummyHash();
  const valid = await verifyPassword(candidateHash, password);

  if (!user || locked || !valid) {
    if (user && !locked) {
      const { failedLoginCount } = await prisma.adminUser.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
        select: { failedLoginCount: true },
      });
      if (failedLoginCount >= MAX_FAILED_ATTEMPTS) {
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MS) },
        });
      }
    }
    // Same message for unknown user, wrong password, and temporarily locked account.
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid username or password, or the account is temporarily locked.');
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  const session = await createSession(user.id, meta);
  return {
    session,
    user: { id: user.id, username: user.username, displayName: user.displayName },
  };
}

export async function changePassword(userId: number, currentSessionId: string, current: string, next: string) {
  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, current))) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Current password is incorrect.');
  }
  if (next === current) throw AppError.validation('Choose a new password that differs from the current one.');
  await prisma.adminUser.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  // Sign out every other device.
  await destroyOtherSessions(userId, currentSessionId);
}

export async function createAdmin(username: string, password: string, displayName?: string) {
  return prisma.adminUser.create({
    data: {
      username: normalise(username),
      passwordHash: await hashPassword(password),
      displayName: displayName ?? null,
    },
    select: { id: true, username: true },
  });
}

export async function resetAdminPassword(username: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { username: normalise(username) } });
  if (!user) throw AppError.notFound('Admin user');
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
}
