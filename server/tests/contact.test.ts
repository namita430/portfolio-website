import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type Admin, app, loginAsAdmin, resetDb } from './helpers';
import { prisma } from '../src/config/prisma';

let admin: Admin;
beforeAll(async () => {
  await resetDb();
  admin = await loginAsAdmin();
});
beforeEach(async () => {
  await prisma.contactMessage.deleteMany();
});

const message = (over: Record<string, unknown> = {}) => ({
  name: 'Asha Sharma',
  email: 'asha@example.com',
  subject: 'Hello Namita',
  message: 'I really liked your portfolio and would like to talk.',
  ...over,
});
const send = (body: object) => request(app).post('/api/v1/contact').send(body);

describe('contact form', () => {
  it('stores a valid message in MySQL and reports honestly that email was not configured', async () => {
    const res = await send(message());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { received: true } });
    const rows = await prisma.contactMessage.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Asha Sharma', isRead: false });
    expect(rows[0].ipHash === null || rows[0].ipHash.length === 64).toBe(true);
    // Email is disabled in tests: it must never be recorded as sent.
    await new Promise((r) => setTimeout(r, 100));
    expect((await prisma.contactMessage.findFirstOrThrow()).emailStatus).toBe('NOT_CONFIGURED');
  });

  it('validates fields with helpful errors', async () => {
    const res = await send(message({ email: 'nope', subject: 'x', message: 'short' }));
    expect(res.status).toBe(422);
    const paths = res.body.error.details.map((d: any) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'subject', 'message']));
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('silently drops bot submissions (honeypot filled)', async () => {
    const res = await send(message({ website: 'http://spam.example' }));
    expect(res.status).toBe(201);
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('silently drops implausibly fast submissions but accepts normal ones', async () => {
    expect((await send(message({ startedAt: Date.now() - 300 }))).status).toBe(201);
    expect(await prisma.contactMessage.count()).toBe(0);
    expect((await send(message({ startedAt: Date.now() - 20_000 }))).status).toBe(201);
    expect(await prisma.contactMessage.count()).toBe(1);
  });

  it('rejects link-stuffed messages', async () => {
    const res = await send(message({ message: 'buy http://a.com http://b.com http://c.com http://d.com now please thanks' }));
    expect(res.status).toBe(422);
    expect(await prisma.contactMessage.count()).toBe(0);
  });

  it('does not store the same message twice in a short window', async () => {
    await send(message());
    await send(message());
    expect(await prisma.contactMessage.count()).toBe(1);
  });

  it('stores HTML as inert text and serves JSON with nosniff', async () => {
    const res = await send(message({ message: '<script>alert(1)</script> hello there friend' }));
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    const list = await admin.get('/api/v1/admin/messages');
    expect(list.body.data[0].message).toBe('<script>alert(1)</script> hello there friend');
  });

  it('is not readable without authentication', async () => {
    await send(message());
    expect((await request(app).get('/api/v1/admin/messages')).status).toBe(401);
  });
});

describe('contact inbox (admin)', () => {
  it('lists, filters, marks read/unread, searches, paginates and deletes', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await prisma.contactMessage.create({ data: { name: `Sender ${i}`, email: `s${i}@example.com`, subject: `Subject ${i}`, message: `Body number ${i}` } });
    }
    const all = await admin.get('/api/v1/admin/messages?pageSize=2');
    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta).toMatchObject({ total: 5, unread: 5, totalPages: 3 });
    expect(all.body.data[0].subject).toBe('Subject 5'); // newest first

    const id = all.body.data[0].id;
    expect((await admin.patch(`/api/v1/admin/messages/${id}`).send({ isRead: true })).body.data.isRead).toBe(true);
    expect((await admin.get('/api/v1/admin/messages?status=unread')).body.meta.total).toBe(4);
    expect((await admin.get('/api/v1/admin/messages?status=read')).body.meta.total).toBe(1);
    expect((await admin.patch(`/api/v1/admin/messages/${id}`).send({ isRead: false })).body.data.isRead).toBe(false);
    expect((await admin.get('/api/v1/admin/messages?q=number%203')).body.data).toHaveLength(1);

    expect((await admin.del(`/api/v1/admin/messages/${id}`)).status).toBe(204);
    expect((await admin.get('/api/v1/admin/messages')).body.meta.total).toBe(4);
    expect((await admin.del(`/api/v1/admin/messages/${id}`)).status).toBe(404);
  });
});
