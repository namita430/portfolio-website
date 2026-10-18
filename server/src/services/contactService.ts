import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import { hmac } from '../utils/text';
import { sendContactNotification } from './emailService';
import type { ContactBody } from '../validators/contact';

const MIN_FILL_MS = 2500;
const MAX_LINKS = 3;
const DUPLICATE_WINDOW_MS = 10 * 60_000;

async function verifyTurnstile(token: string | undefined, ip: string | undefined) {
  if (!env.TURNSTILE_SECRET_KEY) return; // feature disabled
  if (!token) throw AppError.validation('Please complete the human-verification check.');
  try {
    const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) form.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json()) as { success?: boolean };
    if (!json.success) throw new Error('rejected');
  } catch {
    throw AppError.validation('Human verification failed. Please try again.');
  }
}

/**
 * Stores a contact message. Spam handling:
 *  - honeypot field filled / form submitted implausibly fast -> silently dropped (bots get a normal "success")
 *  - too many links -> rejected with a clear message (a real person can fix that)
 *  - identical message from the same address within 10 minutes -> not stored twice
 */
export async function submit(body: ContactBody, ctx: { ip?: string }) {
  if (body.website && body.website.trim() !== '') return { received: true };
  if (body.startedAt && Date.now() - body.startedAt < MIN_FILL_MS) return { received: true };

  const links = body.message.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (links > MAX_LINKS) throw AppError.validation('Messages with several links are not accepted. Please remove some links.');

  await verifyTurnstile(body.turnstileToken, ctx.ip);

  const duplicate = await prisma.contactMessage.findFirst({
    where: { email: body.email, message: body.message, createdAt: { gt: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
    select: { id: true },
  });
  if (duplicate) return { received: true };

  const saved = await prisma.contactMessage.create({
    data: {
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
      ipHash: ctx.ip ? hmac(env.SESSION_SECRET, ctx.ip) : null,
    },
  });

  // Email is best-effort and runs after the response path; the DB row is the source of truth.
  void sendContactNotification(body)
    .then((status) => prisma.contactMessage.update({ where: { id: saved.id }, data: { emailStatus: status } }))
    .catch((err) => logger.error({ err: (err as Error).message }, 'failed to record email status'));

  return { received: true };
}

export async function listAdmin(query: { page: number; pageSize: number; status: 'all' | 'unread' | 'read'; q?: string }) {
  const where: Prisma.ContactMessageWhereInput = {
    ...(query.status === 'unread' ? { isRead: false } : query.status === 'read' ? { isRead: true } : {}),
    ...(query.q
      ? { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }, { subject: { contains: query.q } }, { message: { contains: query.q } }] }
      : {}),
  };
  const [total, unread, items] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: { id: true, name: true, email: true, subject: true, message: true, isRead: true, emailStatus: true, createdAt: true },
    }),
  ]);
  return { total, unread, items };
}

export async function setRead(id: number, isRead: boolean) {
  return prisma.contactMessage.update({
    where: { id },
    data: { isRead },
    select: { id: true, isRead: true },
  });
}

export async function remove(id: number) {
  await prisma.contactMessage.delete({ where: { id } });
}
