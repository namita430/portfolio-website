/**
 * DEVELOPMENT-ONLY demo data, used to see what the site looks like with many items.
 * Everything is labelled "[DEMO]" and can be removed with `npm run seed:demo:clear`.
 * Refuses to run in production.
 */
import 'dotenv/config';
import { prisma } from '../config/prisma';
import { upsertTagIds } from '../services/helpers';

const DEMO = '[DEMO] ';

async function clear() {
  const projects = await prisma.project.deleteMany({ where: { title: { startsWith: DEMO } } });
  const certs = await prisma.certificate.deleteMany({ where: { title: { startsWith: DEMO } } });
  const entries = await prisma.experienceEntry.deleteMany({ where: { title: { startsWith: DEMO } } });
  const msgs = await prisma.contactMessage.deleteMany({ where: { subject: { startsWith: DEMO } } });
  console.log(`Removed demo data: ${projects.count} projects, ${certs.count} certificates, ${entries.count} journey entries, ${msgs.count} messages.`);
}

async function add() {
  await prisma.$transaction(async (tx) => {
    for (let i = 1; i <= 5; i += 1) {
      const tagIds = await upsertTagIds(tx, ['Demo', i % 2 ? 'Node.js' : 'MySQL']);
      await tx.project.create({
        data: {
          slug: `demo-project-${i}`,
          title: `${DEMO}Sample project ${i}`,
          shortDescription: 'Placeholder project used only to preview layouts during development.',
          description: 'This is demo content. Remove it with `npm run seed:demo:clear` before deploying.',
          category: i % 2 ? 'Web Application' : 'Tooling',
          status: 'COMPLETED',
          features: ['Demo feature one', 'Demo feature two'],
          challenges: [{ challenge: 'Demo challenge', solution: 'Demo solution' }],
          isPublished: true,
          isFeatured: i <= 2,
          sortOrder: 100 + i,
          publishedAt: new Date(),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
    }
    for (let i = 1; i <= 4; i += 1) {
      await tx.certificate.create({
        data: {
          title: `${DEMO}Sample certificate ${i}`,
          issuer: 'Demo Issuer',
          category: i % 2 ? 'Programming' : 'Leadership',
          verificationUrl: 'https://example.com/verify',
          isPublished: true,
          sortOrder: 100 + i,
        },
      });
    }
    await tx.experienceEntry.create({
      data: { type: 'WORKSHOP', title: `${DEMO}Sample workshop`, organization: 'Demo Org', isPublished: true, sortOrder: 100 },
    });
    for (let i = 1; i <= 3; i += 1) {
      await tx.contactMessage.create({
        data: { name: 'Demo Sender', email: 'demo@example.com', subject: `${DEMO}Test message ${i}`, message: 'Demo message body.' },
      });
    }
  });
  console.log('Demo data added. Remove it with: npm run seed:demo:clear');
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo data cannot be created in production.');
  if (process.argv.includes('--clear')) await clear();
  else {
    await clear();
    await add();
  }
}

main()
  .catch((err) => {
    console.error((err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
