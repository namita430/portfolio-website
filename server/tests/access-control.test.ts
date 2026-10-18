import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { type Admin, app, loginAsAdmin, resetDb } from './helpers';

/** Every admin endpoint. Anonymous callers must get 401 from ALL of them (server-side authorisation). */
const ADMIN_ENDPOINTS: Array<[string, string]> = [
  ['get', '/overview'],
  ['get', '/tags'],
  ['get', '/profile'],
  ['put', '/profile'],
  ['get', '/settings'],
  ['put', '/settings'],
  ['get', '/resume'],
  ['post', '/resume'],
  ['delete', '/resume'],
  ['post', '/uploads'],
  ['post', '/uploads/cleanup'],
  ['delete', '/uploads/1'],
  ['get', '/projects'],
  ['post', '/projects'],
  ['post', '/projects/reorder'],
  ['get', '/projects/1'],
  ['put', '/projects/1'],
  ['patch', '/projects/1/publish'],
  ['patch', '/projects/1/feature'],
  ['delete', '/projects/1'],
  ['get', '/certificates'],
  ['post', '/certificates'],
  ['post', '/certificates/reorder'],
  ['get', '/certificates/1'],
  ['put', '/certificates/1'],
  ['patch', '/certificates/1/publish'],
  ['patch', '/certificates/1/feature'],
  ['delete', '/certificates/1'],
  ['get', '/experience'],
  ['post', '/experience'],
  ['post', '/experience/reorder'],
  ['get', '/experience/1'],
  ['put', '/experience/1'],
  ['patch', '/experience/1/publish'],
  ['delete', '/experience/1'],
  ['get', '/skills'],
  ['post', '/skills/categories'],
  ['post', '/skills/categories/reorder'],
  ['put', '/skills/categories/1'],
  ['delete', '/skills/categories/1'],
  ['post', '/skills/reorder'],
  ['post', '/skills'],
  ['put', '/skills/1'],
  ['delete', '/skills/1'],
  ['get', '/messages'],
  ['patch', '/messages/1'],
  ['delete', '/messages/1'],
];

let admin: Admin;
beforeAll(async () => {
  await resetDb();
  admin = await loginAsAdmin();
});

describe('server-side authorisation', () => {
  it.each(ADMIN_ENDPOINTS)('%s /api/v1/admin%s -> 401 without a session', async (method, path) => {
    const res = await (request(app) as any)[method](`/api/v1/admin${path}`).send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it.each(ADMIN_ENDPOINTS.filter(([m]) => m !== 'get'))('%s /api/v1/admin%s -> 403 with a session but no CSRF token', async (method, path) => {
    const res = await (admin.agent as any)[method](`/api/v1/admin${path}`).send({});
    expect(res.status).toBe(403);
  });

  it('does not expose mutating methods on public routes', async () => {
    for (const path of ['/projects', '/projects/x', '/certificates', '/skills', '/experience', '/site', '/resume']) {
      for (const method of ['put', 'patch', 'delete'] as const) {
        const res = await (request(app) as any)[method](`/api/v1${path}`).send({});
        expect([401, 404]).toContain(res.status);
      }
    }
    expect((await request(app).post('/api/v1/projects').send({})).status).toBe(404);
  });
});
