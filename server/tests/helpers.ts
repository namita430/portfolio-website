import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { createAdmin } from '../src/services/authService';

export const app = createApp();
export const ADMIN_USER = 'owner';
export const ADMIN_PASSWORD = 'correct-horse-battery-staple';

/** Empties every table (children first) so each test file starts from a known state. */
export async function resetDb() {
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.adminUser.deleteMany(),
    prisma.projectImage.deleteMany(),
    prisma.projectTag.deleteMany(),
    prisma.experienceTag.deleteMany(),
    prisma.project.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.experienceEntry.deleteMany(),
    prisma.resumeAsset.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.fileAsset.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.skillCategory.deleteMany(),
    prisma.siteSettings.deleteMany(),
    prisma.contactMessage.deleteMany(),
  ]);
}

/** A logged-in supertest agent (cookie jar included) plus its CSRF token. */
export async function loginAsAdmin() {
  if (!(await prisma.adminUser.findUnique({ where: { username: ADMIN_USER } }))) {
    await createAdmin(ADMIN_USER, ADMIN_PASSWORD, 'Owner');
  }
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ username: ADMIN_USER, password: ADMIN_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const csrf: string = res.body.data.csrfToken;
  return {
    agent,
    csrf,
    post: (url: string) => agent.post(url).set('X-CSRF-Token', csrf),
    put: (url: string) => agent.put(url).set('X-CSRF-Token', csrf),
    patch: (url: string) => agent.patch(url).set('X-CSRF-Token', csrf),
    del: (url: string) => agent.delete(url).set('X-CSRF-Token', csrf),
    get: (url: string) => agent.get(url),
  };
}

export type Admin = Awaited<ReturnType<typeof loginAsAdmin>>;

export async function pngBuffer(width = 40, height = 30) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).png().toBuffer();
}

/** Minimal valid-looking PDF. `extra` lets tests inject content (e.g. scripts). */
export function pdfBuffer(extra = '') {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${extra}\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`, 'latin1');
}

export const sampleProject = (overrides: Record<string, unknown> = {}) => ({
  title: 'Test Project',
  shortDescription: 'A short description.',
  description: 'A longer description of the project.',
  category: 'Web Application',
  status: 'COMPLETED',
  githubUrl: 'https://github.com/example/test',
  liveUrl: null,
  features: ['One', 'Two'],
  challenges: [{ challenge: 'Hard thing', solution: 'Clever fix' }],
  isPublished: true,
  tags: ['Node.js', 'MySQL'],
  ...overrides,
});
