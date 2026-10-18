import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { assertAsset, releaseAssets, serializeAsset } from './assetService';
import { dateOnly, nextSortOrder } from './helpers';
import type { CertificateBody } from '../validators/certificate';

const include = { file: true, thumbnail: true } satisfies Prisma.CertificateInclude;
type CertFull = Prisma.CertificateGetPayload<{ include: typeof include }>;

function toPublic(c: CertFull) {
  return {
    id: c.id,
    title: c.title,
    issuer: c.issuer,
    issueDate: dateOnly(c.issueDate),
    credentialId: c.credentialId,
    verificationUrl: c.verificationUrl,
    description: c.description,
    category: c.category,
    isFeatured: c.isFeatured,
    file: c.file ? serializeAsset(c.file) : null,
    thumbnail: c.thumbnail ? serializeAsset(c.thumbnail) : null,
  };
}

const toAdmin = (c: CertFull) => ({
  ...toPublic(c),
  isPublished: c.isPublished,
  sortOrder: c.sortOrder,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

export async function listPublic(query: { page: number; pageSize: number; q?: string; category?: string; featured?: boolean }) {
  const where: Prisma.CertificateWhereInput = {
    isPublished: true,
    ...(query.category ? { category: query.category } : {}),
    ...(query.featured ? { isFeatured: true } : {}),
    ...(query.q ? { OR: [{ title: { contains: query.q } }, { issuer: { contains: query.q } }] } : {}),
  };
  const [total, rows, categories] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      include,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.certificate.groupBy({ by: ['category'], where: { isPublished: true }, orderBy: { category: 'asc' } }),
  ]);
  return { total, items: rows.map(toPublic), categories: categories.map((c) => c.category) };
}

export async function listAdmin(query: { page: number; pageSize: number; q?: string; status: 'all' | 'published' | 'draft' }) {
  const where: Prisma.CertificateWhereInput = {
    ...(query.status === 'published' ? { isPublished: true } : query.status === 'draft' ? { isPublished: false } : {}),
    ...(query.q ? { OR: [{ title: { contains: query.q } }, { issuer: { contains: query.q } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
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
  const cert = await prisma.certificate.findUnique({ where: { id }, include });
  if (!cert) throw AppError.notFound('Certificate');
  return toAdmin(cert);
}

/**
 * Honesty guard: a certificate may only be public when the owner has either uploaded the document
 * or supplied a verification link. Drafts without evidence can still be saved.
 */
function assertPublishable(body: Pick<CertificateBody, 'isPublished' | 'fileId' | 'verificationUrl'>) {
  if (body.isPublished && !body.fileId && !body.verificationUrl) {
    throw AppError.validation('Upload the certificate file or add a verification URL before publishing it.', [
      { path: 'isPublished', message: 'Add evidence (file or verification URL) first.' },
    ]);
  }
}

async function validateAssets(body: CertificateBody) {
  await assertAsset(body.fileId, ['image', 'document'], 'Certificate file');
  await assertAsset(body.thumbnailId, ['image'], 'Preview image');
}

export async function create(body: CertificateBody) {
  assertPublishable(body);
  await validateAssets(body);
  const cert = await prisma.certificate.create({
    data: { ...body, sortOrder: await nextSortOrder(prisma.certificate, 'start') },
    include,
  });
  return toAdmin(cert);
}

export async function update(id: number, body: CertificateBody) {
  assertPublishable(body);
  await validateAssets(body);
  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Certificate');
  const cert = await prisma.certificate.update({ where: { id }, data: body, include });
  await releaseAssets([existing.fileId, existing.thumbnailId]);
  return toAdmin(cert);
}

export async function setPublished(id: number, isPublished: boolean) {
  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Certificate');
  assertPublishable({ isPublished, fileId: existing.fileId, verificationUrl: existing.verificationUrl });
  return toAdmin(await prisma.certificate.update({ where: { id }, data: { isPublished }, include }));
}

export async function setFeatured(id: number, isFeatured: boolean) {
  return toAdmin(await prisma.certificate.update({ where: { id }, data: { isFeatured }, include }));
}

export async function remove(id: number) {
  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Certificate');
  await prisma.certificate.delete({ where: { id } });
  await releaseAssets([existing.fileId, existing.thumbnailId]);
}
