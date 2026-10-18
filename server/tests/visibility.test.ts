import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { type Admin, app, loginAsAdmin, resetDb, sampleProject } from './helpers';
import { prisma } from '../src/config/prisma';
import { seedIfEmpty } from '../src/seed/firstRun';

let admin: Admin;
beforeAll(async () => {
  await resetDb();
  admin = await loginAsAdmin();
});

const publicGet = (path: string) => request(app).get(`/api/v1${path}`);

describe('projects: published vs unpublished', () => {
  let publishedId: number;
  let draftId: number;

  beforeAll(async () => {
    const a = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Visible One', isPublished: true, tags: ['React'], category: 'Web' }));
    const b = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Secret Draft', isPublished: false, tags: ['Hidden Tag'], category: 'Secret Category' }));
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    publishedId = a.body.data.id;
    draftId = b.body.data.id;
  });

  it('public list contains only published projects', async () => {
    const res = await publicGet('/projects');
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: any) => p.title)).toEqual(['Visible One']);
    expect(res.body.meta.total).toBe(1);
  });

  it('public responses never expose admin-only fields', async () => {
    const list = await publicGet('/projects');
    const detail = await publicGet('/projects/visible-one');
    for (const body of [list.body.data[0], detail.body.data]) {
      expect(body).not.toHaveProperty('isPublished');
      expect(body).not.toHaveProperty('sortOrder');
      expect(body).not.toHaveProperty('createdAt');
    }
  });

  it('an unpublished project is a 404 by slug (indistinguishable from a missing one)', async () => {
    const draft = await publicGet('/projects/secret-draft');
    const missing = await publicGet('/projects/does-not-exist');
    expect(draft.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(draft.body.error.message).toBe(missing.body.error.message);
  });

  it('search, tag and category filters never surface drafts', async () => {
    for (const path of ['/projects?q=Secret', '/projects?tag=hidden-tag', '/projects?category=Secret%20Category']) {
      const res = await publicGet(path);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    }
  });

  it('filter metadata only includes published content', async () => {
    const res = await publicGet('/projects/filters');
    expect(res.body.data.categories.map((c: any) => c.name)).toEqual(['Web']);
    expect(res.body.data.tags.map((t: any) => t.name)).not.toContain('Hidden Tag');
  });

  it('publishing makes a draft public and unpublishing hides it again immediately', async () => {
    const on = await admin.patch(`/api/v1/admin/projects/${draftId}/publish`).send({ isPublished: true });
    expect(on.status).toBe(200);
    expect((await publicGet('/projects/secret-draft')).status).toBe(200);
    expect((await publicGet('/projects')).body.meta.total).toBe(2);

    const off = await admin.patch(`/api/v1/admin/projects/${draftId}/publish`).send({ isPublished: false });
    expect(off.status).toBe(200);
    expect((await publicGet('/projects/secret-draft')).status).toBe(404);
    expect((await publicGet('/projects')).body.meta.total).toBe(1);
  });

  it('the admin list shows drafts too', async () => {
    const res = await admin.get('/api/v1/admin/projects');
    expect(res.body.data.map((p: any) => p.id).sort()).toEqual([publishedId, draftId].sort());
    const drafts = await admin.get('/api/v1/admin/projects?status=draft');
    expect(drafts.body.data.map((p: any) => p.id)).toEqual([draftId]);
  });

  it('featured filter works', async () => {
    await admin.patch(`/api/v1/admin/projects/${publishedId}/feature`).send({ isFeatured: true });
    const res = await publicGet('/projects?featured=true');
    expect(res.body.data.map((p: any) => p.id)).toEqual([publishedId]);
  });
});

describe('certificates: published vs unpublished', () => {
  const cert = (over: Record<string, unknown> = {}) => ({
    title: 'Cert',
    issuer: 'Issuer',
    category: 'Programming',
    isPublished: false,
    ...over,
  });

  it('refuses to publish a certificate that has no file and no verification URL', async () => {
    const res = await admin.post('/api/v1/admin/certificates').send(cert({ isPublished: true }));
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/verification URL|file/i);
    expect(await prisma.certificate.count()).toBe(0);
  });

  it('drafts are saved but hidden; publishing with evidence reveals them', async () => {
    const draft = await admin.post('/api/v1/admin/certificates').send(cert({ title: 'Draft Cert' }));
    expect(draft.status).toBe(201);
    expect((await publicGet('/certificates')).body.data).toEqual([]);

    const noEvidence = await admin.patch(`/api/v1/admin/certificates/${draft.body.data.id}/publish`).send({ isPublished: true });
    expect(noEvidence.status).toBe(422);

    const withUrl = await admin
      .put(`/api/v1/admin/certificates/${draft.body.data.id}`)
      .send(cert({ title: 'Draft Cert', verificationUrl: 'https://example.com/verify/123', isPublished: true }));
    expect(withUrl.status).toBe(200);
    const pub = await publicGet('/certificates');
    expect(pub.body.data.map((c: any) => c.title)).toEqual(['Draft Cert']);
    expect(pub.body.data[0]).not.toHaveProperty('isPublished');
    expect(pub.body.meta.categories).toEqual(['Programming']);
  });
});

describe('journey and skills visibility', () => {
  it('only published journey entries are public', async () => {
    await admin.post('/api/v1/admin/experience').send({ type: 'TRAINING', title: 'Public Training', organization: 'Org A', isPublished: true, tags: ['Python'] });
    await admin.post('/api/v1/admin/experience').send({ type: 'WORKSHOP', title: 'Hidden Workshop', organization: 'Org B', isPublished: false });
    const res = await publicGet('/experience');
    expect(res.body.data.map((e: any) => e.title)).toEqual(['Public Training']);
    expect(res.body.data[0].skills).toEqual(['Python']);
  });

  it('hidden categories, hidden skills and empty categories are omitted', async () => {
    const shown = await admin.post('/api/v1/admin/skills/categories').send({ name: 'Shown', icon: 'code' });
    const hidden = await admin.post('/api/v1/admin/skills/categories').send({ name: 'Hidden Cat', icon: 'code', isVisible: false });
    const empty = await admin.post('/api/v1/admin/skills/categories').send({ name: 'Empty Cat', icon: 'code' });
    expect(empty.status).toBe(201);
    await admin.post('/api/v1/admin/skills').send({ categoryId: shown.body.data.id, name: 'Visible Skill' });
    await admin.post('/api/v1/admin/skills').send({ categoryId: shown.body.data.id, name: 'Hidden Skill', isVisible: false });
    await admin.post('/api/v1/admin/skills').send({ categoryId: hidden.body.data.id, name: 'In Hidden Category' });

    const res = await publicGet('/skills');
    expect(res.body.data.map((c: any) => c.name)).toEqual(['Shown']);
    expect(res.body.data[0].skills.map((s: any) => s.name)).toEqual(['Visible Skill']);
  });
});

describe('first-run seed', () => {
  it('seeds only real content, keeps certificates as drafts, and never overwrites existing data', async () => {
    await resetDb();
    admin = await loginAsAdmin();
    expect(await seedIfEmpty(prisma)).toBe('seeded');

    const site = await publicGet('/site');
    expect(site.status).toBe(200);
    expect(site.body.data.profile.fullName).toBe('Namita Giri');
    expect(site.body.data.settings.heroHeadline).toBe('Building Digital Experiences That Solve Real Problems.');
    expect(site.body.data.resume).toBeNull();

    const projects = await publicGet('/projects');
    expect(projects.body.data.map((p: any) => p.slug).sort()).toEqual(['skill-connect-nepal', 'smartbite']);
    const smartbite = await publicGet('/projects/smartbite');
    expect(smartbite.body.data.liveUrl).toBe('https://vocal-sprinkles-6b716c.netlify.app/login');

    // No credential is public until the owner attaches evidence and publishes it.
    expect((await publicGet('/certificates')).body.data).toEqual([]);
    expect(await prisma.certificate.count()).toBeGreaterThan(0);

    // Skills: no percentages, React not claimed.
    const skills = await publicGet('/skills');
    const names = skills.body.data.flatMap((c: any) => c.skills.map((s: any) => s.name));
    expect(names).toContain('Django REST Framework');
    expect(names).not.toContain('React');
    expect(JSON.stringify(skills.body)).not.toMatch(/percent|%|level/i);

    // Owner deletes a seeded project; a second seed run must not bring it back.
    const sb = await admin.get('/api/v1/admin/projects');
    const id = sb.body.data.find((p: any) => p.slug === 'smartbite').id;
    expect((await admin.del(`/api/v1/admin/projects/${id}`)).status).toBe(204);
    expect(await seedIfEmpty(prisma)).toBe('skipped');
    expect((await publicGet('/projects/smartbite')).status).toBe(404);
  });
});
