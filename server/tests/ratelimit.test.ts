import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, resetDb } from './helpers';

beforeAll(async () => {
  await resetDb();
  process.env.ENABLE_RATE_LIMIT_IN_TESTS = 'true'; // limiters are skipped in other test files
});
afterAll(() => {
  delete process.env.ENABLE_RATE_LIMIT_IN_TESTS;
});

describe('rate limiting', () => {
  it('limits login attempts per IP (429 after 10 tries)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const res = await request(app).post('/api/v1/auth/login').send({ username: `ghost${i}`, password: 'whatever-password' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('limits contact submissions (429 after 5 per hour)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await request(app)
        .post('/api/v1/contact')
        .send({ name: 'Rate Tester', email: `rt${i}@example.com`, subject: `Subject ${i}`, message: `A sufficiently long message number ${i}.` });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('uses the standard error envelope for 429', async () => {
    const res = await request(app).post('/api/v1/contact').send({});
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ success: false, error: { code: 'RATE_LIMITED' } });
  });
});
