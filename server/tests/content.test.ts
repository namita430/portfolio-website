import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { type Admin, app, loginAsAdmin, resetDb, sampleProject } from './helpers';
import { prisma } from '../src/config/prisma';

let admin: Admin;
beforeAll(async () => {
  await resetDb();
  admin = await loginAsAdmin();
});

describe('projects CRUD', () => {
  let id: number;

  it('creates a project with auto slug, tags, features and challenges', async () => {
    const res = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'My Great App!', tags: ['Node.js', 'node.js', 'C++', 'C#'] }));
    expect(res.status).toBe(201);
    id = res.body.data.id;
    expect(res.body.data.slug).toBe('my-great-app');
    // duplicate "Node.js" removed (case-insensitive); C++ and C# stay distinct tags
    expect(res.body.data.tags.map((t: any) => t.name).sort()).toEqual(['C#', 'C++', 'Node.js']);
    expect(res.body.data.features).toEqual(['One', 'Two']);
    expect(res.body.data.challenges).toEqual([{ challenge: 'Hard thing', solution: 'Clever fix' }]);
    expect(res.body.data.publishedAt).toBeTruthy(); // set automatically when published
  });

  it('generates unique slugs for identical titles', async () => {
    const a = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Twin' }));
    const b = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Twin' }));
    expect(a.body.data.slug).toBe('twin');
    expect(b.body.data.slug).toBe('twin-2');
  });

  it('rejects an explicit slug that is already taken with 409', async () => {
    const res = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Other', slug: 'twin' }));
    expect(res.status).toBe(409);
  });

  it('updates fields, replaces tags and keeps the slug unless changed', async () => {
    const res = await admin.put(`/api/v1/admin/projects/${id}`).send(sampleProject({ title: 'Renamed', tags: ['Express'], liveUrl: 'https://demo.example.com' }));
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Renamed');
    expect(res.body.data.slug).toBe('my-great-app');
    expect(res.body.data.tags.map((t: any) => t.name)).toEqual(['Express']);
    expect(res.body.data.liveUrl).toBe('https://demo.example.com');
  });

  it('validates input and reports field-level errors', async () => {
    const res = await admin.post('/api/v1/admin/projects').send({ title: '', shortDescription: 'x', description: 'y', category: 'c' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: any) => d.path)).toContain('title');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>1</script>', 'ftp://example.com/x', 'not a url'])('rejects unsafe link %s', async (bad) => {
    const res = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Bad link', githubUrl: bad }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.map((d: any) => d.path)).toContain('githubUrl');
  });

  it('strips control characters from text fields', async () => {
    const res = await admin.post('/api/v1/admin/projects').send(sampleProject({ title: 'Clean\u0000 title\u0007', isPublished: false }));
    expect(res.body.data.title).toBe('Clean title');
  });

  it('reorders projects and the public list follows the new order', async () => {
    const all = await admin.get('/api/v1/admin/projects');
    const ids: number[] = all.body.data.map((p: any) => p.id);
    const reversed = [...ids].reverse();
    expect((await admin.post('/api/v1/admin/projects/reorder').send({ ids: reversed })).status).toBe(204);
    const pub = await request(app).get('/api/v1/projects');
    const publicIds = pub.body.data.map((p: any) => p.id);
    expect(publicIds).toEqual(reversed.filter((i) => publicIds.includes(i)));
  });

  it('returns 404 for reordering unknown ids and rolls back', async () => {
    const res = await admin.post('/api/v1/admin/projects/reorder').send({ ids: [999999] });
    expect(res.status).toBe(404);
  });

  it('deletes a project and its tag links', async () => {
    expect((await admin.del(`/api/v1/admin/projects/${id}`)).status).toBe(204);
    expect((await admin.get(`/api/v1/admin/projects/${id}`)).status).toBe(404);
    expect(await prisma.projectTag.count({ where: { projectId: id } })).toBe(0);
  });

  it('rejects non-numeric ids with 422', async () => {
    expect((await admin.get('/api/v1/admin/projects/abc')).status).toBe(422);
  });

  it('paginates the public list', async () => {
    for (let i = 0; i < 4; i += 1) await admin.post('/api/v1/admin/projects').send(sampleProject({ title: `Page item ${i}` }));
    const res = await request(app).get('/api/v1/projects?pageSize=2&page=2');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 2, pageSize: 2 });
    expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);
    expect((await request(app).get('/api/v1/projects?pageSize=999')).status).toBe(422);
  });
});

describe('certificates CRUD', () => {
  it('creates, edits, features, reorders and deletes', async () => {
    const mk = (title: string) =>
      admin.post('/api/v1/admin/certificates').send({
        title,
        issuer: 'Org',
        category: 'Programming',
        issueDate: '2026-03-01',
        credentialId: 'ABC-123',
        verificationUrl: 'https://example.com/v/1',
        isPublished: true,
      });
    const a = await mk('Cert A');
    const b = await mk('Cert B');
    expect(a.status).toBe(201);
    expect(a.body.data.issueDate).toBe('2026-03-01'); // plain date, no timezone drift

    expect((await admin.put(`/api/v1/admin/certificates/${a.body.data.id}`).send({ ...a.body.data, title: 'Cert A2', isPublished: true })).body.data.title).toBe('Cert A2');
    expect((await admin.patch(`/api/v1/admin/certificates/${a.body.data.id}/feature`).send({ isFeatured: true })).body.data.isFeatured).toBe(true);

    expect((await admin.post('/api/v1/admin/certificates/reorder').send({ ids: [a.body.data.id, b.body.data.id] })).status).toBe(204);
    const pub = await request(app).get('/api/v1/certificates');
    expect(pub.body.data.map((c: any) => c.title)).toEqual(['Cert A2', 'Cert B']);

    expect((await admin.del(`/api/v1/admin/certificates/${b.body.data.id}`)).status).toBe(204);
    expect((await request(app).get('/api/v1/certificates')).body.data).toHaveLength(1);
  });

  it('rejects impossible dates', async () => {
    const res = await admin.post('/api/v1/admin/certificates').send({ title: 'x', issuer: 'y', category: 'z', issueDate: '2026-02-31' });
    expect(res.status).toBe(422);
  });
});

describe('journey CRUD', () => {
  it('validates date order and clears the end date for current entries', async () => {
    const bad = await admin.post('/api/v1/admin/experience').send({ type: 'TRAINING', title: 'T', organization: 'O', startDate: '2026-05-01', endDate: '2026-01-01' });
    expect(bad.status).toBe(422);

    const current = await admin.post('/api/v1/admin/experience').send({ type: 'INTERNSHIP', title: 'Now', organization: 'O', startDate: '2026-01-01', endDate: '2026-02-01', isCurrent: true });
    expect(current.status).toBe(201);
    expect(current.body.data.endDate).toBeNull();
  });

  it('supports editing, reordering and deleting', async () => {
    const a = await admin.post('/api/v1/admin/experience').send({ type: 'WEBINAR', title: 'Webinar A', organization: 'Org', isPublished: true, tags: ['MERN'] });
    const upd = await admin.put(`/api/v1/admin/experience/${a.body.data.id}`).send({ type: 'WEBINAR', title: 'Webinar A (edited)', organization: 'Org', isPublished: true, tags: ['MERN', 'React'] });
    expect(upd.body.data.skills).toEqual(['MERN', 'React']);
    const list = await admin.get('/api/v1/admin/experience');
    const ids = list.body.data.map((e: any) => e.id);
    expect((await admin.post('/api/v1/admin/experience/reorder').send({ ids: [...ids].reverse() })).status).toBe(204);
    expect((await admin.del(`/api/v1/admin/experience/${a.body.data.id}`)).status).toBe(204);
  });
});

describe('skills, profile and settings', () => {
  it('manages categories and skills', async () => {
    const cat = await admin.post('/api/v1/admin/skills/categories').send({ name: 'Cat X', icon: 'server' });
    expect(cat.status).toBe(201);
    const dup = await admin.post('/api/v1/admin/skills/categories').send({ name: 'Cat X', icon: 'server' });
    expect(dup.status).toBe(409);
    const skill = await admin.post('/api/v1/admin/skills').send({ categoryId: cat.body.data.id, name: 'Skill X', note: 'Learning' });
    expect(skill.status).toBe(201);
    expect((await admin.put(`/api/v1/admin/skills/${skill.body.data.id}`).send({ categoryId: cat.body.data.id, name: 'Skill Y', note: null })).body.data.name).toBe('Skill Y');
    expect((await admin.post('/api/v1/admin/skills').send({ categoryId: 999999, name: 'Orphan' })).status).toBe(422);
    expect((await admin.del(`/api/v1/admin/skills/categories/${cat.body.data.id}`)).status).toBe(204);
    expect(await prisma.skill.count({ where: { name: 'Skill Y' } })).toBe(0); // cascaded
  });

  it('updates profile and settings, which are immediately visible on /site', async () => {
    const profile = {
      fullName: 'Namita Giri',
      titles: ['Frontend Developer', 'Full-Stack Developer'],
      introduction: 'Hello there.',
      objective: null,
      aboutTitle: 'About',
      aboutBody: 'Body text.',
      aboutHighlights: [{ label: 'Based in', value: 'Nepal' }],
      location: 'Nepal',
      email: 'namitagiri783@gmail.com',
      githubUrl: 'https://github.com/namita430',
      linkedinUrl: null,
    };
    const settings = {
      siteTitle: 'Site',
      siteDescription: 'Desc',
      heroHeadline: 'Headline',
      heroSubtext: 'Sub',
      theme: 'jade',
      sectionVisibility: { about: true, skills: true, projects: true, certificates: false, journey: true, contact: true },
      footerText: 'Footer',
      showResumeButton: true,
    };
    expect((await admin.put('/api/v1/admin/profile').send(profile)).status).toBe(200);
    expect((await admin.put('/api/v1/admin/settings').send(settings)).status).toBe(200);
    const site = await request(app).get('/api/v1/site');
    expect(site.body.data.profile.titles).toEqual(['Frontend Developer', 'Full-Stack Developer']);
    expect(site.body.data.settings.theme).toBe('jade');
    expect(site.body.data.settings.sectionVisibility.certificates).toBe(false);

    expect((await admin.put('/api/v1/admin/settings').send({ ...settings, theme: 'neon-pink' })).status).toBe(422);
    expect((await admin.put('/api/v1/admin/profile').send({ ...profile, email: 'not-an-email' })).status).toBe(422);
  });

  it('reports overview counts', async () => {
    const res = await admin.get('/api/v1/admin/overview');
    expect(res.status).toBe(200);
    expect(res.body.data.counts.projects.total).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
  });
});
