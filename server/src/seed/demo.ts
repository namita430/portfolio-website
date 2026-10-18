/**
 * DEVELOPMENT-ONLY demo data, so you can see the site with a fuller page and practise using the dashboard.
 *
 *   npm run seed:demo          add (or refresh) the sample content
 *   npm run seed:demo:clear    remove every piece of it again, including the placeholder images
 *
 * Everything is labelled "[DEMO]" and the images are plainly marked "DEMO IMAGE" abstract placeholders — they are
 * NOT screenshots of anything. Refuses to run in production, and never touches your real content.
 */
import 'dotenv/config';
import sharp from 'sharp';
import { prisma } from '../config/prisma';
import { upsertTagIds } from '../services/helpers';

const DEMO = '[DEMO] ';

type Rgb = [number, number, number];

/** An abstract gradient with a "DEMO IMAGE" caption — obviously a placeholder. */
async function demoImage(label: string, [r, g, b]: Rgb, width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgb(${r},${g},${b})"/><stop offset="1" stop-color="rgb(${Math.round(r * 0.35)},${Math.round(g * 0.35)},${Math.round(b * 0.35)})"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2">
      <circle cx="${width * 0.78}" cy="${height * 0.3}" r="${height * 0.32}"/><circle cx="${width * 0.78}" cy="${height * 0.3}" r="${height * 0.5}"/>
    </g>
    <text x="${width * 0.06}" y="${height * 0.82}" font-family="Consolas, monospace" font-size="${Math.round(height * 0.07)}" letter-spacing="4" fill="#ffffff" fill-opacity="0.8">DEMO IMAGE</text>
    <text x="${width * 0.06}" y="${height * 0.9}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(height * 0.05)}" fill="#ffffff" fill-opacity="0.6">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function loadAssetService() {
  try {
    return await import('../services/assetService.js');
  } catch (err) {
    console.warn(`(placeholder images skipped: ${(err as Error).message.split('\n')[0]})`);
    return null;
  }
}

async function clear() {
  const projects = await prisma.project.deleteMany({ where: { title: { startsWith: DEMO } } });
  const certs = await prisma.certificate.deleteMany({ where: { title: { startsWith: DEMO } } });
  const entries = await prisma.experienceEntry.deleteMany({ where: { title: { startsWith: DEMO } } });
  const categories = await prisma.skillCategory.deleteMany({ where: { name: { startsWith: DEMO } } });
  const msgs = await prisma.contactMessage.deleteMany({ where: { subject: { startsWith: DEMO } } });

  // placeholder images (and their stored files), only if nothing real uses them
  let images = 0;
  const demoAssets = await prisma.fileAsset.findMany({ where: { originalName: { startsWith: 'demo-' } }, select: { id: true } });
  if (demoAssets.length) {
    const svc = await loadAssetService();
    if (svc) for (const a of demoAssets) if (await svc.deleteAssetIfUnreferenced(a.id)) images += 1;
  }
  console.log(
    `Removed demo data: ${projects.count} projects, ${certs.count} certificates, ${entries.count} journey entries, ` +
      `${categories.count} skill categories, ${msgs.count} messages, ${images} placeholder images.`,
  );
}

async function add() {
  const svc = await loadAssetService();
  const image = async (file: string, purpose: 'PROJECT_COVER' | 'PROJECT_IMAGE' | 'CERTIFICATE', label: string, rgb: Rgb, w = 1600, h = 1000) => {
    if (!svc) return null;
    const buffer = await demoImage(label, rgb, w, h);
    return svc.uploadAsset({ buffer, originalname: `demo-${file}.png`, mimetype: 'image/png' }, purpose);
  };

  const covers = {
    one: await image('cover-1', 'PROJECT_COVER', 'Sample project one', [240, 166, 58]),
    two: await image('cover-2', 'PROJECT_COVER', 'Sample project two', [79, 209, 165]),
    three: await image('cover-3', 'PROJECT_COVER', 'Sample project three', [154, 165, 255]),
  };
  const gallery = [
    await image('gallery-1', 'PROJECT_IMAGE', 'Gallery image 1', [255, 127, 143]),
    await image('gallery-2', 'PROJECT_IMAGE', 'Gallery image 2', [90, 140, 230]),
    await image('gallery-3', 'PROJECT_IMAGE', 'Gallery image 3', [200, 150, 90]),
  ];
  const certImages = [
    await image('certificate-1', 'CERTIFICATE', 'Sample certificate A', [120, 160, 220], 1400, 990),
    await image('certificate-2', 'CERTIFICATE', 'Sample certificate B', [220, 170, 110], 1400, 990),
  ];

  await prisma.$transaction(
    async (tx) => {
      // ---- projects (sort orders are high so your real projects stay first)
      const projects = [
        { n: 1, title: 'Sample dashboard app', category: 'Web Application', status: 'COMPLETED' as const, featured: true, cover: covers.one, tags: ['Demo', 'React', 'Node.js'], full: true },
        { n: 2, title: 'Sample booking platform', category: 'Platform', status: 'IN_PROGRESS' as const, featured: true, cover: covers.two, tags: ['Demo', 'MySQL', 'Express'], full: false },
        { n: 3, title: 'Sample portfolio template', category: 'Design', status: 'LIVE_DEMO' as const, featured: false, cover: covers.three, tags: ['Demo', 'CSS', 'Design'], full: false },
        { n: 4, title: 'Sample command-line tool', category: 'Tooling', status: 'COMPLETED' as const, featured: false, cover: null, tags: ['Demo', 'Python'], full: false },
        { n: 5, title: 'Sample idea (concept)', category: 'Platform', status: 'CONCEPT' as const, featured: false, cover: null, tags: ['Demo'], full: false },
        { n: 6, title: 'Sample archived experiment', category: 'Tooling', status: 'ARCHIVED' as const, featured: false, cover: null, tags: ['Demo', 'JavaScript'], full: false },
      ];
      for (const p of projects) {
        const tagIds = await upsertTagIds(tx, p.tags);
        await tx.project.create({
          data: {
            slug: `demo-project-${p.n}`,
            title: `${DEMO}${p.title}`,
            tagline: 'Placeholder content for trying out the dashboard',
            shortDescription: 'Demo project used only to preview layouts and practise editing. Delete it from the dashboard or run `npm run seed:demo:clear`.',
            description: 'This is demo content, not real work.\n\nIt exists so you can see cards, filters, galleries and detail pages with more than a couple of projects. Edit it, unpublish it, or delete it to see how the dashboard behaves.',
            category: p.category,
            status: p.status,
            githubUrl: p.n <= 3 ? 'https://github.com/namita430' : null,
            liveUrl: p.status === 'LIVE_DEMO' ? 'https://example.com' : null,
            features: p.full ? ['Demo feature one', 'Demo feature two', 'Demo feature three'] : [],
            challenges: p.full ? [{ challenge: 'A demo challenge to show how this section looks.', solution: 'A demo solution that explains how it was handled.' }] : [],
            lessonsLearned: p.full ? 'Demo lessons learned. Replace this with what you really took away from a project.' : null,
            publishedAt: new Date(Date.UTC(2026, p.n, 1)),
            isFeatured: p.featured,
            isPublished: true,
            sortOrder: 100 + p.n,
            coverImageId: p.cover?.id ?? null,
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
            images: p.n === 1 ? { create: gallery.filter(Boolean).map((a, i) => ({ assetId: a!.id, altText: `Demo gallery image ${i + 1}`, sortOrder: i })) } : undefined,
          },
        });
      }

      // ---- certificates (published ones carry a verification link, as the real ones must)
      const certs = [
        { n: 1, title: 'Sample programming course', issuer: 'Demo Academy', category: 'Programming', file: certImages[0], featured: true, published: true },
        { n: 2, title: 'Sample leadership workshop', issuer: 'Demo Institute', category: 'Leadership', file: certImages[1], featured: false, published: true },
        { n: 3, title: 'Sample AI fundamentals', issuer: 'Demo Academy', category: 'Artificial Intelligence', file: null, featured: false, published: true },
        { n: 4, title: 'Sample draft certificate (unpublished)', issuer: 'Demo Academy', category: 'Programming', file: null, featured: false, published: false },
      ];
      for (const c of certs) {
        await tx.certificate.create({
          data: {
            title: `${DEMO}${c.title}`,
            issuer: c.issuer,
            category: c.category,
            issueDate: c.published ? new Date(Date.UTC(2026, c.n, 15)) : null,
            credentialId: c.published ? `DEMO-${1000 + c.n}` : null,
            verificationUrl: c.published ? 'https://example.com/verify' : null,
            description: c.published ? 'Demo certificate used to preview the gallery and lightbox.' : null,
            fileId: c.file?.id ?? null,
            isFeatured: c.featured,
            isPublished: c.published,
            sortOrder: 100 + c.n,
          },
        });
      }

      // ---- journey
      const journey = [
        { n: 1, type: 'WORKSHOP' as const, title: 'Sample workshop', organization: 'Demo Org', start: [2026, 4, 10], end: [2026, 4, 12], current: false, tags: ['Demo', 'Teamwork'] },
        { n: 2, type: 'INTERNSHIP' as const, title: 'Sample internship', organization: 'Demo Company', start: [2026, 6, 1], end: null, current: true, tags: ['Demo', 'React'] },
        { n: 3, type: 'WEBINAR' as const, title: 'Sample webinar', organization: 'Demo Community', start: null, end: null, current: false, tags: ['Demo'] },
      ];
      for (const e of journey) {
        const tagIds = await upsertTagIds(tx, e.tags);
        await tx.experienceEntry.create({
          data: {
            type: e.type,
            title: `${DEMO}${e.title}`,
            organization: e.organization,
            role: e.n === 2 ? 'Demo role' : null,
            description: 'Demo entry for previewing the timeline.',
            startDate: e.start ? new Date(Date.UTC(e.start[0]!, e.start[1]! - 1, e.start[2]!)) : null,
            endDate: e.end ? new Date(Date.UTC(e.end[0]!, e.end[1]! - 1, e.end[2]!)) : null,
            isCurrent: e.current,
            isPublished: true,
            sortOrder: 100 + e.n,
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
          },
        });
      }

      // ---- skills
      await tx.skillCategory.create({
        data: {
          name: `${DEMO}Databases`,
          icon: 'database',
          description: 'Demo skill group.',
          sortOrder: 100,
          skills: { create: [{ name: 'Demo SQL', sortOrder: 0 }, { name: 'Demo indexing', note: 'Learning', sortOrder: 1 }] },
        },
      });

      // ---- inbox
      const messages = [
        { name: 'Demo Recruiter', email: 'recruiter@example.com', subject: 'Interested in your work', message: 'Hello!\n\nThis is a demo message so the inbox has something in it.\n\nBest regards,\nDemo Recruiter', isRead: false },
        { name: 'Demo Classmate', email: 'classmate@example.com', subject: 'Question about SmartBite', message: 'A second demo message, already marked as read.', isRead: true },
        { name: 'Demo Visitor', email: 'visitor@example.com', subject: 'Hi', message: 'A third demo message with a <b>tag</b> to show that HTML is displayed as plain text, never run.', isRead: false },
      ];
      for (const m of messages) await tx.contactMessage.create({ data: { ...m, subject: `${DEMO}${m.subject}` } });
    },
    { timeout: 60_000 },
  );
  console.log('Demo data added (projects, certificates, journey, skills, messages, placeholder images).');
  console.log('Remove it any time with: npm run seed:demo:clear');
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo data cannot be created in production.');
  await clear(); // always start clean so running it twice never duplicates anything
  if (!process.argv.includes('--clear')) await add();
}

main()
  .catch((err) => {
    console.error((err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
