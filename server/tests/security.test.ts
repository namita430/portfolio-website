import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './helpers';

describe('HTTP hardening', () => {
  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('allows credentialed CORS only from configured origins', async () => {
    const allowed = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const denied = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers preflight for allowed origins with the CSRF header permitted', async () => {
    const res = await request(app)
      .options('/api/v1/admin/projects')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-token');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-headers']).toMatch(/x-csrf-token/i);
  });

  it('returns JSON errors without stack traces or internals', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts|node_modules|prisma/i);
  });

  it('rejects malformed JSON with 400 and oversized bodies with 413', async () => {
    const bad = await request(app).post('/api/v1/contact').set('Content-Type', 'application/json').send('{"name": ');
    expect(bad.status).toBe(400);
    const big = await request(app).post('/api/v1/contact').send({ message: 'x'.repeat(300_000) });
    expect(big.status).toBe(413);
  });

  it('is resistant to SQL injection in query and path parameters', async () => {
    const q = await request(app).get("/api/v1/projects?q=' OR 1=1 --&tag=x'; DROP TABLE Project;--");
    expect(q.status).toBe(200);
    expect(q.body.data).toEqual([]);
    const slug = await request(app).get("/api/v1/projects/x'%20OR%20'1'='1");
    expect([404, 422]).toContain(slug.status);
    // table still there
    expect((await request(app).get('/api/v1/projects')).status).toBe(200);
  });

  it('reports database readiness', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe('up');
  });
});
