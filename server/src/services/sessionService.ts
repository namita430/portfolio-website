import type { CookieOptions } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { randomToken, sha256 } from '../utils/text';

const TTL_MS = env.SESSION_TTL_HOURS * 3_600_000;
const IDLE_MS = env.SESSION_IDLE_HOURS * 3_600_000;
const TOUCH_INTERVAL_MS = 60_000;
const MAX_SESSIONS_PER_USER = 10;

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
    maxAge: TTL_MS,
  };
}

export function clearCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...rest } = sessionCookieOptions();
  return rest;
}

/**
 * Creates a session. The raw token is returned once (to be set as an HTTP-only cookie);
 * only its SHA-256 hash is stored, so a leaked database cannot be used to hijack sessions.
 */
export async function createSession(userId: number, meta: { ip?: string; userAgent?: string }) {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        id: sha256(token),
        userId,
        csrfToken,
        expiresAt,
        ipAddress: meta.ip?.slice(0, 64),
        userAgent: meta.userAgent?.slice(0, 255),
      },
    });
    // Keep only the newest few sessions per user.
    const stale = await tx.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: MAX_SESSIONS_PER_USER,
      select: { id: true },
    });
    if (stale.length) await tx.session.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  });

  return { token, csrfToken, expiresAt };
}

export async function resolveSession(token: string) {
  const id = sha256(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, username: true, displayName: true } } },
  });
  if (!session) return null;

  const now = Date.now();
  const expired = session.expiresAt.getTime() <= now;
  const idle = now - session.lastSeenAt.getTime() > IDLE_MS;
  if (expired || idle) {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.updateMany({ where: { id }, data: { lastSeenAt: new Date(now) } });
  }
  return session;
}

export async function destroySession(token: string) {
  await prisma.session.deleteMany({ where: { id: sha256(token) } });
}

export async function destroyOtherSessions(userId: number, keepSessionId: string) {
  await prisma.session.deleteMany({ where: { userId, id: { not: keepSessionId } } });
}

export async function purgeExpiredSessions() {
  const idleCutoff = new Date(Date.now() - IDLE_MS);
  const { count } = await prisma.session.deleteMany({
    where: { OR: [{ expiresAt: { lte: new Date() } }, { lastSeenAt: { lte: idleCutoff } }] },
  });
  return count;
}
