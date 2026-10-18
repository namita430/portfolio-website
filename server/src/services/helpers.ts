import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { slugify } from '../utils/text';

export type Tx = Prisma.TransactionClient;

/** YYYY-MM-DD for @db.Date columns (avoids timezone surprises on the client). */
export const dateOnly = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/** Tag slug: "Node.js" and "NodeJS" merge; "C++" and "C#" stay distinct. */
export function tagSlug(name: string) {
  return slugify(name.replace(/\+/g, 'plus').replace(/#/g, 'sharp').replace(/\./g, ''));
}

/** Finds or creates tags by (case-insensitive) name and returns their ids. */
export async function upsertTagIds(tx: Tx, names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of names) {
    const slug = tagSlug(name);
    const tag = await tx.tag.upsert({ where: { slug }, update: {}, create: { name, slug } });
    ids.push(tag.id);
  }
  return ids;
}

type SortAggregate = { _min?: { sortOrder?: number | null } | null; _max?: { sortOrder?: number | null } | null };
type SortDelegate = { aggregate: (args: any) => PromiseLike<SortAggregate> };

/** New items go to the top ("start") for dated content, or to the bottom ("end") for lists like skills. */
export async function nextSortOrder(delegate: SortDelegate, position: 'start' | 'end', where?: object) {
  const agg = await delegate.aggregate({ _min: { sortOrder: true }, _max: { sortOrder: true }, where });
  return position === 'start' ? (agg._min?.sortOrder ?? 1) - 1 : (agg._max?.sortOrder ?? -1) + 1;
}

/** Assigns sortOrder = index to each id, atomically. Unknown ids produce a 404 and roll back. */
export async function applyOrder(model: 'project' | 'certificate' | 'experienceEntry' | 'skillCategory' | 'skill', ids: number[]) {
  const delegate = prisma[model] as unknown as { update: (args: any) => any };
  try {
    await prisma.$transaction(ids.map((id, index) => delegate.update({ where: { id }, data: { sortOrder: index } })));
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') throw AppError.notFound('One of the items');
    throw err;
  }
}

/** Generates a slug that is unique for projects, appending -2, -3, ... when needed. */
export async function uniqueProjectSlug(tx: Tx, base: string, excludeId?: number) {
  const root = slugify(base);
  let candidate = root;
  for (let n = 2; n < 500; n += 1) {
    const clash = await tx.project.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === excludeId) return candidate;
    candidate = `${root}-${n}`.slice(0, 120);
  }
  throw AppError.conflict('Could not generate a unique slug.');
}

export const recordNotFound = (what: string) => AppError.notFound(what);
