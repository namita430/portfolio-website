import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { assertAsset, releaseAssets, serializeAsset } from './assetService';
import { dateOnly, nextSortOrder, upsertTagIds } from './helpers';
import type { ExperienceBody } from '../validators/experience';

const include = {
  document: true,
  tags: { include: { tag: true }, orderBy: { tag: { name: 'asc' } } },
} satisfies Prisma.ExperienceEntryInclude;
type EntryFull = Prisma.ExperienceEntryGetPayload<{ include: typeof include }>;

function toPublic(e: EntryFull) {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    organization: e.organization,
    role: e.role,
    location: e.location,
    startDate: dateOnly(e.startDate),
    endDate: dateOnly(e.endDate),
    isCurrent: e.isCurrent,
    description: e.description,
    document: e.document ? serializeAsset(e.document) : null,
    skills: e.tags.map((t) => t.tag.name),
  };
}

const toAdmin = (e: EntryFull) => ({ ...toPublic(e), isPublished: e.isPublished, sortOrder: e.sortOrder, updatedAt: e.updatedAt });

export async function listPublic() {
  const rows = await prisma.experienceEntry.findMany({
    where: { isPublished: true },
    include,
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return rows.map(toPublic);
}

export async function listAdmin() {
  const rows = await prisma.experienceEntry.findMany({ include, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  return rows.map(toAdmin);
}

export async function getAdmin(id: number) {
  const entry = await prisma.experienceEntry.findUnique({ where: { id }, include });
  if (!entry) throw AppError.notFound('Journey entry');
  return toAdmin(entry);
}

function data(body: ExperienceBody, tagIds: number[]) {
  const { tags: _tags, ...rest } = body;
  return { ...rest, tags: { create: tagIds.map((tagId) => ({ tagId })) } };
}

export async function create(body: ExperienceBody) {
  await assertAsset(body.documentId, ['image', 'document'], 'Supporting document');
  const entry = await prisma.$transaction(async (tx) => {
    const tagIds = await upsertTagIds(tx, body.tags);
    return tx.experienceEntry.create({
      data: { ...data(body, tagIds), sortOrder: await nextSortOrder(tx.experienceEntry, 'start') },
      include,
    });
  });
  return toAdmin(entry);
}

export async function update(id: number, body: ExperienceBody) {
  await assertAsset(body.documentId, ['image', 'document'], 'Supporting document');
  const existing = await prisma.experienceEntry.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Journey entry');
  const entry = await prisma.$transaction(async (tx) => {
    const tagIds = await upsertTagIds(tx, body.tags);
    await tx.experienceTag.deleteMany({ where: { entryId: id } });
    return tx.experienceEntry.update({ where: { id }, data: data(body, tagIds), include });
  });
  await releaseAssets([existing.documentId]);
  return toAdmin(entry);
}

export async function setPublished(id: number, isPublished: boolean) {
  return toAdmin(await prisma.experienceEntry.update({ where: { id }, data: { isPublished }, include }));
}

export async function remove(id: number) {
  const existing = await prisma.experienceEntry.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Journey entry');
  await prisma.experienceEntry.delete({ where: { id } });
  await releaseAssets([existing.documentId]);
}
