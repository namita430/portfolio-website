import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { type Admin, app, loginAsAdmin, pdfBuffer, pngBuffer, resetDb, sampleProject } from './helpers';
import { prisma } from '../src/config/prisma';
import { LOCAL_UPLOAD_DIR } from '../src/services/storage';

let admin: Admin;
beforeAll(async () => {
  await resetDb();
  admin = await loginAsAdmin();
});

const upload = (buf: Buffer, filename: string, contentType: string, purpose: string) =>
  admin.post('/api/v1/admin/uploads').attach('file', buf, { filename, contentType }).field('purpose', purpose);

const fileExists = async (assetId: number) => {
  const row = await prisma.fileAsset.findUnique({ where: { id: assetId } });
  return { row, onDisk: row ? fs.existsSync(path.join(LOCAL_UPLOAD_DIR, row.storageKey)) : false };
};

describe('upload validation', () => {
  it('accepts a real PNG, re-encodes it and records metadata', async () => {
    const res = await upload(await pngBuffer(120, 80), 'cover.png', 'image/png', 'PROJECT_COVER');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ mimeType: 'image/png', width: 120, height: 80 });
    expect(res.body.data.url).toMatch(/^http:\/\/localhost:4000\/uploads\/projects\/\d{4}\/[0-9a-f]{32}\.png$/);
    const { row, onDisk } = await fileExists(res.body.data.id);
    expect(row?.originalName).toBe('cover.png');
    expect(onDisk).toBe(true);
  });

  it('rejects a text file renamed to .png', async () => {
    const res = await upload(Buffer.from('this is definitely not an image, just text content'), 'evil.png', 'image/png', 'PROJECT_COVER');
    expect(res.status).toBe(415);
  });

  it('rejects PNG magic bytes followed by garbage', async () => {
    const buf = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 7)]);
    const res = await upload(buf, 'broken.png', 'image/png', 'PROJECT_COVER');
    expect(res.status).toBe(415);
  });

  it('rejects an extension that does not match the contents', async () => {
    const res = await upload(await pngBuffer(), 'photo.jpg', 'image/png', 'PROJECT_COVER');
    expect(res.status).toBe(415);
  });

  it('rejects a declared MIME type that does not match the contents', async () => {
    const res = await upload(await pngBuffer(), 'photo.png', 'image/jpeg', 'PROJECT_COVER');
    expect(res.status).toBe(415);
  });

  it('rejects SVG (script-capable) and executables', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
    expect((await upload(svg, 'x.svg', 'image/svg+xml', 'PROJECT_COVER')).status).toBe(415);
    expect((await upload(Buffer.from('MZ\x90\x00\x03\x00\x00\x00 fake exe'), 'x.exe', 'application/octet-stream', 'CERTIFICATE')).status).toBe(415);
  });

  it('rejects files over the size limit', async () => {
    const huge = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(3 * 1024 * 1024)]);
    const res = await upload(huge, 'huge.png', 'image/png', 'PROJECT_COVER');
    expect(res.status).toBe(413);
  });

  it('enforces per-purpose rules (no PDF as a cover, only PDF as a resume)', async () => {
    expect((await upload(pdfBuffer(), 'a.pdf', 'application/pdf', 'PROJECT_COVER')).status).toBe(415);
    const asResume = await admin.post('/api/v1/admin/resume').attach('file', await pngBuffer(), { filename: 'r.png', contentType: 'image/png' });
    expect(asResume.status).toBe(415);
  });

  it('accepts a clean PDF for certificates but rejects PDFs containing scripts', async () => {
    expect((await upload(pdfBuffer(), 'cert.pdf', 'application/pdf', 'CERTIFICATE')).status).toBe(201);
    const scripted = pdfBuffer('2 0 obj\n<< /S /JavaScript /JS (app.alert(1)) >>\nendobj');
    expect((await upload(scripted, 'bad.pdf', 'application/pdf', 'CERTIFICATE')).status).toBe(415);
  });

  it('requires a purpose and a file', async () => {
    const noPurpose = await admin.post('/api/v1/admin/uploads').attach('file', await pngBuffer(), { filename: 'a.png', contentType: 'image/png' });
    expect(noPurpose.status).toBe(422);
    const noFile = await admin.post('/api/v1/admin/uploads').field('purpose', 'PROJECT_COVER');
    expect(noFile.status).toBe(400);
  });
});

describe('asset lifecycle', () => {
  it('replacing a cover deletes the old file, but a shared file is kept until nothing uses it', async () => {
    const first = (await upload(await pngBuffer(50, 50), 'one.png', 'image/png', 'PROJECT_COVER')).body.data;
    const second = (await upload(await pngBuffer(60, 60), 'two.png', 'image/png', 'PROJECT_COVER')).body.data;

    const p1 = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Uses first', coverImageId: first.id }));
    const p2 = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Also first', coverImageId: first.id }));
    expect(p1.status).toBe(201);

    // referenced files cannot be deleted directly
    expect((await admin.del(`/api/v1/admin/uploads/${first.id}`)).status).toBe(409);

    // p1 moves to the second image; the first is still used by p2, so it must survive
    await admin.put(`/api/v1/admin/projects/${p1.body.data.id}`).send(sampleProject({ title: 'Uses first', coverImageId: second.id }));
    expect((await fileExists(first.id)).onDisk).toBe(true);

    // p2 stops using it too -> now it is cleaned up (row and object)
    await admin.put(`/api/v1/admin/projects/${p2.body.data.id}`).send(sampleProject({ title: 'Also first', coverImageId: null }));
    const gone = await fileExists(first.id);
    expect(gone.row).toBeNull();
    expect(gone.onDisk).toBe(false);

    // deleting the project releases its remaining file
    await admin.del(`/api/v1/admin/projects/${p1.body.data.id}`);
    expect((await fileExists(second.id)).row).toBeNull();
  });

  it('only image assets can be used as a cover; unknown ids are rejected', async () => {
    const pdf = (await upload(pdfBuffer(), 'doc.pdf', 'application/pdf', 'CERTIFICATE')).body.data;
    const asCover = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'PDF cover', coverImageId: pdf.id }));
    expect(asCover.status).toBe(422);
    const unknown = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Ghost cover', coverImageId: 424242 }));
    expect(unknown.status).toBe(422);
  });

  it('project screenshots are stored in order and released with the project', async () => {
    const a = (await upload(await pngBuffer(30, 30), 'a.png', 'image/png', 'PROJECT_IMAGE')).body.data;
    const b = (await upload(await pngBuffer(31, 31), 'b.png', 'image/png', 'PROJECT_IMAGE')).body.data;
    const res = await admin.post('/api/v1/admin/projects').send(
      sampleProject({ title: 'Gallery', screenshots: [{ assetId: b.id, altText: 'Second' }, { assetId: a.id, altText: 'First' }] }),
    );
    expect(res.status).toBe(201);
    expect(res.body.data.images.map((i: any) => i.altText)).toEqual(['Second', 'First']);
    await admin.del(`/api/v1/admin/projects/${res.body.data.id}`);
    expect((await fileExists(a.id)).row).toBeNull();
    expect((await fileExists(b.id)).row).toBeNull();
  });

  it('removes orphaned uploads on demand but never referenced ones', async () => {
    const orphan = (await upload(await pngBuffer(20, 20), 'orphan.png', 'image/png', 'PROJECT_IMAGE')).body.data;
    const kept = (await upload(await pngBuffer(21, 21), 'kept.png', 'image/png', 'PROJECT_COVER')).body.data;
    const proj = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Keeper', coverImageId: kept.id }));
    await prisma.fileAsset.updateMany({ where: { id: { in: [orphan.id, kept.id] } }, data: { createdAt: new Date(Date.now() - 3 * 3_600_000) } });

    const res = await admin.post('/api/v1/admin/uploads/cleanup').send({});
    expect(res.status).toBe(200);
    expect((await fileExists(orphan.id)).row).toBeNull();
    expect((await fileExists(kept.id)).row).not.toBeNull();
    await admin.del(`/api/v1/admin/projects/${proj.body.data.id}`);
  });
});

describe('resume', () => {
  it('only shows a resume publicly when one exists, replaces it cleanly, and can remove it', async () => {
    expect((await request(app).get('/api/v1/resume')).body.data).toBeNull();

    const first = await admin.post('/api/v1/admin/resume').attach('file', pdfBuffer(), { filename: 'cv-2026.pdf', contentType: 'application/pdf' });
    expect(first.status).toBe(200);
    const pub = await request(app).get('/api/v1/resume');
    expect(pub.body.data.url).toMatch(/\/resume\/\d{4}\/[0-9a-f]{32}\.pdf$/);
    expect(pub.body.data.updatedAt).toBeTruthy();

    const second = await admin.post('/api/v1/admin/resume').attach('file', pdfBuffer('% newer'), { filename: 'cv-new.pdf', contentType: 'application/pdf' });
    expect(second.status).toBe(200);
    expect((await fileExists(first.body.data.id)).row).toBeNull(); // old resume file cleaned up
    expect(await prisma.resumeAsset.count()).toBe(1);

    expect((await admin.del('/api/v1/admin/resume')).status).toBe(204);
    expect((await request(app).get('/api/v1/resume')).body.data).toBeNull();
    expect((await fileExists(second.body.data.id)).row).toBeNull();
  });
});
