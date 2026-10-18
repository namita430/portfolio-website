import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_PASSWORD, ADMIN_USER, app, loginAsAdmin, resetDb, sampleProject } from './helpers';
import { prisma } from '../src/config/prisma';
import { createAdmin } from '../src/services/authService';

beforeEach(resetDb);

describe('login', () => {
  it('sets an HttpOnly session cookie, returns a CSRF token and never leaks the password hash', async () => {
    await createAdmin(ADMIN_USER, ADMIN_PASSWORD);
    const res = await request(app).post('/api/v1/auth/login').send({ username: ADMIN_USER, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toMatch(/^sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(res.body.data.csrfToken).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/i);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('stores only a hash of the session token in the database', async () => {
    await createAdmin(ADMIN_USER, ADMIN_PASSWORD);
    const res = await request(app).post('/api/v1/auth/login').send({ username: ADMIN_USER, password: ADMIN_PASSWORD });
    const token = /^sid=([^;]+)/.exec((res.headers['set-cookie'] as unknown as string[])[0])![1];
    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toHaveLength(64);
    expect(sessions[0].id).not.toBe(token);
  });

  it('stores passwords as Argon2id hashes', async () => {
    await createAdmin(ADMIN_USER, ADMIN_PASSWORD);
    const user = await prisma.adminUser.findUniqueOrThrow({ where: { username: ADMIN_USER } });
    expect(user.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(user.passwordHash).not.toContain(ADMIN_PASSWORD);
  });

  it('gives the same generic error for a wrong password and an unknown user', async () => {
    await createAdmin(ADMIN_USER, ADMIN_PASSWORD);
    const wrong = await request(app).post('/api/v1/auth/login').send({ username: ADMIN_USER, password: 'not-the-password-123' });
    const unknown = await request(app).post('/api/v1/auth/login').send({ username: 'nobody', password: 'not-the-password-123' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
    expect(wrong.headers['set-cookie']).toBeUndefined();
  });

  it('locks the account after 5 failed attempts, even for the correct password', async () => {
    await createAdmin(ADMIN_USER, ADMIN_PASSWORD);
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/api/v1/auth/login').send({ username: ADMIN_USER, password: 'wrong-password-123' });
      expect(res.status).toBe(401);
    }
    const locked = await request(app).post('/api/v1/auth/login').send({ username: ADMIN_USER, password: ADMIN_PASSWORD });
    expect(locked.status).toBe(401);
    const user = await prisma.adminUser.findUniqueOrThrow({ where: { username: ADMIN_USER } });
    expect(user.lockedUntil && user.lockedUntil.getTime() > Date.now()).toBe(true);
  });

  it('rejects malformed login bodies with 422', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: '', password: 12 });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe('sessions', () => {
  it('requires a session for /auth/me and works once logged in', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    const admin = await loginAsAdmin();
    const me = await admin.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.username).toBe(ADMIN_USER);
    expect(me.body.data.csrfToken).toBe(admin.csrf);
  });

  it('logout destroys the session server-side (a replayed cookie stops working)', async () => {
    await createAdmin(ADMIN_USER, ADMIN_PASSWORD);
    const login = await request(app).post('/api/v1/auth/login').send({ username: ADMIN_USER, password: ADMIN_PASSWORD });
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(200);
    const out = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it('rejects expired sessions', async () => {
    const admin = await loginAsAdmin();
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await admin.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('rejects idle sessions', async () => {
    const admin = await loginAsAdmin();
    await prisma.session.updateMany({ data: { lastSeenAt: new Date(Date.now() - 48 * 3_600_000) } });
    expect((await admin.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('ignores garbage cookies', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', 'sid=totally-made-up-token-value-123456');
    expect(res.status).toBe(401);
  });
});

describe('CSRF and origin protection', () => {
  it('blocks state-changing admin requests without a CSRF token', async () => {
    const admin = await loginAsAdmin();
    const res = await admin.agent.post('/api/v1/admin/projects').send(sampleProject());
    expect(res.status).toBe(403);
  });

  it('blocks requests with a wrong CSRF token', async () => {
    const admin = await loginAsAdmin();
    const res = await admin.agent.post('/api/v1/admin/projects').set('X-CSRF-Token', 'nope').send(sampleProject());
    expect(res.status).toBe(403);
  });

  it('accepts the correct CSRF token', async () => {
    const admin = await loginAsAdmin();
    expect((await admin.post('/api/v1/admin/projects').send(sampleProject())).status).toBe(201);
  });

  it('rejects state-changing requests from an untrusted Origin even with valid cookie + token', async () => {
    const admin = await loginAsAdmin();
    const res = await admin.post('/api/v1/admin/projects').set('Origin', 'https://evil.example').send(sampleProject());
    expect(res.status).toBe(403);
  });

  it('accepts requests from an allowed Origin', async () => {
    const admin = await loginAsAdmin();
    const res = await admin.post('/api/v1/admin/projects').set('Origin', 'http://localhost:5173').send(sampleProject());
    expect(res.status).toBe(201);
  });
});

describe('password change', () => {
  it('signs out other devices and enforces the policy', async () => {
    const first = await loginAsAdmin();
    const second = await request.agent(app);
    const login = await second.post('/api/v1/auth/login').send({ username: ADMIN_USER, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);

    const weak = await first.post('/api/v1/auth/change-password').send({ currentPassword: ADMIN_PASSWORD, newPassword: 'short' });
    expect(weak.status).toBe(422);

    const wrongCurrent = await first.post('/api/v1/auth/change-password').send({ currentPassword: 'wrong-current-pass', newPassword: 'a-brand-new-long-passphrase' });
    expect(wrongCurrent.status).toBe(401);

    const changed = await first.post('/api/v1/auth/change-password').send({ currentPassword: ADMIN_PASSWORD, newPassword: 'a-brand-new-long-passphrase' });
    expect(changed.status).toBe(204);

    expect((await first.get('/api/v1/auth/me')).status).toBe(200);
    expect((await second.get('/api/v1/auth/me')).status).toBe(401);

    const oldLogin = await request(app).post('/api/v1/auth/login').send({ username: ADMIN_USER, password: ADMIN_PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/v1/auth/login').send({ username: ADMIN_USER, password: 'a-brand-new-long-passphrase' });
    expect(newLogin.status).toBe(200);
  });
});
