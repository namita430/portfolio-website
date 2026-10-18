import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { assertAsset, releaseAssets, serializeAsset } from './assetService';
import { nextSortOrder, uniqueProjectSlug, upsertTagIds } from './helpers';
import type { ProjectBody } from '../validators/project';

const include = {
  coverImage: true,
  images: { include: { asset: true }, orderBy: { sortOrder: 'asc' } },
  tags: { include: { tag: true }, orderBy: { tag: { name: 'asc' } } },
} satisfies Prisma.ProjectInclude;

type ProjectFull = Prisma.ProjectGetPayload<{ include: typeof include }>;

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Lightweight shape for cards and lists. */
function toListItem(p: ProjectFull) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    shortDescription: p.shortDescription,
    category: p.category,
    status: p.status,
    githubUrl: p.githubUrl,
    liveUrl: p.liveUrl,
    isFeatured: p.isFeatured,
    publishedAt: p.publishedAt,
    coverImage: p.coverImage ? serializeAsset(p.coverImage) : null,
    tags: p.tags.map((t) => ({ name: t.tag.name, slug: t.tag.slug })),
  };
}

function toDetail(p: ProjectFull) {
  return {
    ...toListItem(p),
    description: p.description,
    features: asArray<string>(p.features),
    challenges: asArray<{ challenge: string; solution: string }>(p.challenges),
    lessonsLearned: p.lessonsLearned,
    images: p.images.map((i) => ({ id: i.id, altText: i.altText, asset: serializeAsset(i.asset) })),
    updatedAt: p.updatedAt,
  };
}

/** Admin shape: everything, including publication flags. */
function toAdmin(p: ProjectFull) {
  return { ...toDetail(p), isPublished: p.isPublished, sortOrder: p.sortOrder, createdAt: p.createdAt };
}

// ----------------------------------------------------------------------------- public

export async function listPublic(query: {
  page: number;
  pageSize: number;
  q?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
  sort: 'order' | 'newest';
}) {
  const where: Prisma.ProjectWhereInput = {
    isPublished: true,
    ...(query.category ? { category: query.category } : {}),
    ...(query.featured ? { isFeatured: true } : {}),
    ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q } },
            { shortDescription: { contains: query.q } },
            { description: { contains: query.q } },
            { tags: { some: { tag: { name: { contains: query.q } } } } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    query.sort === 'newest' ? [{ publishedAt: 'desc' }, { id: 'desc' }] : [{ sortOrder: 'asc' }, { id: 'asc' }];

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { total, items: rows.map(toListItem) };
}

export async function getPublicBySlug(slug: string) {
  // Unpublished projects are indistinguishable from missing ones.
  const project = await prisma.project.findFirst({ where: { slug, isPublished: true }, include });
  if (!project) throw AppError.notFound('Project');
  return toDetail(project);
}

/** Categories and tags that exist on published projects, for the filter UI. */
export async function publicFilters() {
  const [categories, tags] = await Promise.all([
    prisma.project.groupBy({ by: ['category'], where: { isPublished: true }, _count: { _all: true }, orderBy: { category: 'asc' } }),
    prisma.tag.findMany({
      where: { projects: { some: { project: { isPublished: true } } } },
      select: { name: true, slug: true, _count: { select: { projects: { where: { project: { isPublished: true } } } } } },
      orderBy: { name: 'asc' },
    }),
  ]);
  return {
    categories: categories.map((c) => ({ name: c.category, count: c._count._all })),
    tags: tags.map((t) => ({ name: t.name, slug: t.slug, count: t._count.projects })),
  };
}

// ----------------------------------------------------------------------------- admin

export async function listAdmin(query: { page: number; pageSize: number; q?: string; status: 'all' | 'published' | 'draft' }) {
  const where: Prisma.ProjectWhereInput = {
    ...(query.status === 'published' ? { isPublished: true } : query.status === 'draft' ? { isPublished: false } : {}),
    ...(query.q ? { OR: [{ title: { contains: query.q } }, { category: { contains: query.q } }, { slug: { contains: query.q } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { total, items: rows.map(toAdmin) };
}

export async function getAdmin(id: number) {
  const project = await prisma.project.findUnique({ where: { id }, include });
  if (!project) throw AppError.notFound('Project');
  return toAdmin(project);
}

async function validateAssets(body: ProjectBody) {
  await assertAsset(body.coverImageId, ['image'], 'Cover image');
  for (const s of body.screenshots) await assertAsset(s.assetId, ['image'], 'Screenshot');
}

export async function create(body: ProjectBody) {
  await validateAssets(body);
  const project = await prisma.$transaction(async (tx) => {
    const slug = body.slug ? body.slug : await uniqueProjectSlug(tx, body.title);
    if (body.slug && (await tx.project.findUnique({ where: { slug }, select: { id: true } }))) {
      throw AppError.conflict(`The slug "${slug}" is already used by another project.`);
    }
    const tagIds = await upsertTagIds(tx, body.tags);
    return tx.project.create({
      data: {
        slug,
        title: body.title,
        tagline: body.tagline,
        shortDescription: body.shortDescription,
        description: body.description,
        category: body.category,
        status: body.status,
        githubUrl: body.githubUrl,
        liveUrl: body.liveUrl,
        features: body.features,
        challenges: body.challenges,
        lessonsLearned: body.lessonsLearned,
        publishedAt: body.publishedAt ?? (body.isPublished ? new Date() : null),
        isFeatured: body.isFeatured,
        isPublished: body.isPublished,
        sortOrder: await nextSortOrder(tx.project, 'start'),
        coverImageId: body.coverImageId,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        images: { create: body.screenshots.map((s, i) => ({ assetId: s.assetId, altText: s.altText, sortOrder: i })) },
      },
      include,
    });
  });
  return toAdmin(project);
}

export async function update(id: number, body: ProjectBody) {
  await validateAssets(body);
  const existing = await prisma.project.findUnique({ where: { id }, include: { images: true } });
  if (!existing) throw AppError.notFound('Project');

  const project = await prisma.$transaction(async (tx) => {
    let slug = existing.slug;
    if (body.slug && body.slug !== existing.slug) {
      if (await tx.project.findFirst({ where: { slug: body.slug, id: { not: id } }, select: { id: true } })) {
        throw AppError.conflict(`The slug "${body.slug}" is already used by another project.`);
      }
      slug = body.slug;
    }
    const tagIds = await upsertTagIds(tx, body.tags);
    await tx.projectTag.deleteMany({ where: { projectId: id } });
    await tx.projectImage.deleteMany({ where: { projectId: id } });
    return tx.project.update({
      where: { id },
      data: {
        slug,
        title: body.title,
        tagline: body.tagline,
        shortDescription: body.shortDescription,
        description: body.description,
        category: body.category,
        status: body.status,
        githubUrl: body.githubUrl,
        liveUrl: body.liveUrl,
        features: body.features,
        challenges: body.challenges,
        lessonsLearned: body.lessonsLearned,
        publishedAt: body.publishedAt ?? (body.isPublished ? (existing.publishedAt ?? new Date()) : null),
        isFeatured: body.isFeatured,
        isPublished: body.isPublished,
        coverImageId: body.coverImageId,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        images: { create: body.screenshots.map((s, i) => ({ assetId: s.assetId, altText: s.altText, sortOrder: i })) },
      },
      include,
    });
  });

  // Files that were attached before but no longer are: delete only if nothing else uses them.
  await releaseAssets([existing.coverImageId, ...existing.images.map((i) => i.assetId)]);
  return toAdmin(project);
}

export async function setPublished(id: number, isPublished: boolean) {
  const existing = await prisma.project.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!existing) throw AppError.notFound('Project');
  const project = await prisma.project.update({
    where: { id },
    data: { isPublished, ...(isPublished && !existing.publishedAt ? { publishedAt: new Date() } : {}) },
    include,
  });
  return toAdmin(project);
}

export async function setFeatured(id: number, isFeatured: boolean) {
  const project = await prisma.project.update({ where: { id }, data: { isFeatured }, include });
  return toAdmin(project);
}

export async function remove(id: number) {
  const existing = await prisma.project.findUnique({ where: { id }, include: { images: true } });
  if (!existing) throw AppError.notFound('Project');
  await prisma.project.delete({ where: { id } }); // ProjectTag / ProjectImage rows cascade
  await releaseAssets([existing.coverImageId, ...existing.images.map((i) => i.assetId)]);
}
