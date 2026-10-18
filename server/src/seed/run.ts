import 'dotenv/config';
import { prisma } from '../config/prisma';
import { seedIfEmpty } from './firstRun';

seedIfEmpty(prisma)
  .then((result) =>
    console.log(
      result === 'seeded'
        ? 'Seeded initial content (profile, settings, skills, projects, draft certificates, journey).'
        : 'Database already has content — nothing was changed.',
    ),
  )
  .catch((err) => {
    console.error('Seed failed:', (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
