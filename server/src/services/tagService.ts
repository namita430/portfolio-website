import { prisma } from '../config/prisma';

/** All technology/skill tags, used for autocomplete in the admin forms. */
export async function listAll() {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' }, take: 500, select: { name: true } });
  return tags.map((t) => t.name);
}
