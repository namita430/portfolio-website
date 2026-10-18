import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The S3 driver (used for Cloudflare R2 / Backblaze B2 / any S3-compatible bucket) is exercised against a
 * local mock endpoint. This verifies request shape, caching headers and cleanup — NOT real provider behaviour.
 */
interface Captured {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  bytes: number;
}
const calls: Captured[] = [];
let server: http.Server;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let bytes = 0;
    req.on('data', (c: Buffer) => (bytes += c.length));
    req.on('end', () => {
      calls.push({ method: req.method!, url: req.url!, headers: req.headers, bytes });
      res.statusCode = req.method === 'DELETE' ? 204 : 200;
      res.setHeader('ETag', '"abc"');
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  Object.assign(process.env, {
    STORAGE_DRIVER: 's3',
    S3_ENDPOINT: `http://127.0.0.1:${port}`,
    S3_BUCKET: 'portfolio-files',
    S3_REGION: 'auto',
    S3_ACCESS_KEY_ID: 'test-key',
    S3_SECRET_ACCESS_KEY: 'test-secret',
    S3_FORCE_PATH_STYLE: 'true',
    STORAGE_PUBLIC_BASE_URL: 'https://files.example.com/',
  });
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('S3-compatible storage driver', () => {
  it('uploads with immutable cache headers, signs the request, and builds the public URL', async () => {
    const { storage } = await import('../src/services/storage/index.js');
    expect(storage.name).toBe('s3');

    await storage.put('projects/2026/abc123.png', Buffer.from('png-bytes'), 'image/png');
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.url.split('?')[0]).toBe('/portfolio-files/projects/2026/abc123.png'); // SDK appends ?x-id=PutObject
    expect(put.headers['content-type']).toBe('image/png');
    expect(put.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(put.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=test-key\//);
    expect(put.bytes).toBeGreaterThan(0);

    expect(storage.publicUrl('projects/2026/abc123.png')).toBe('https://files.example.com/projects/2026/abc123.png');
  });

  it('deletes objects and never throws if the provider call fails', async () => {
    const { storage } = await import('../src/services/storage/index.js');
    await storage.delete('projects/2026/abc123.png');
    expect(calls.some((c) => c.method === 'DELETE' && c.url.split('?')[0] === '/portfolio-files/projects/2026/abc123.png')).toBe(true);

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await expect(storage.delete('projects/2026/gone.png')).resolves.toBeUndefined();
  });

  it('refuses unsafe storage keys (path traversal)', async () => {
    const { storage } = await import('../src/services/storage/index.js');
    await expect(storage.put('../etc/passwd', Buffer.from('x'), 'text/plain')).rejects.toThrow(/Unsafe storage key/);
    await expect(storage.put('a//b.png', Buffer.from('x'), 'image/png')).rejects.toThrow(/Unsafe storage key/);
  });
});
