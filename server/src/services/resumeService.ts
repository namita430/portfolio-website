import { prisma } from '../config/prisma';
import { releaseAssets, serializeAsset, uploadAsset } from './assetService';

type ResumeRow = Awaited<ReturnType<typeof findActive>>;

const findActive = () =>
  prisma.resumeAsset.findFirst({
    where: { isActive: true },
    include: { asset: true },
    orderBy: { uploadedAt: 'desc' },
  });

function serialize(row: NonNullable<ResumeRow>) {
  return { ...serializeAsset(row.asset), updatedAt: row.uploadedAt };
}

/** Returns null unless a resume exists AND its stored URL parses as an http(s) URL. */
export async function getPublic() {
  const row = await findActive();
  if (!row) return null;
  try {
    const url = new URL(row.asset.url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  } catch {
    return null;
  }
  return serialize(row);
}

export async function getAdmin() {
  const row = await findActive();
  return row ? serialize(row) : null;
}

/** Replaces the current resume. Only one resume is kept; the old file is deleted once unreferenced. */
export async function replace(file: Parameters<typeof uploadAsset>[0]) {
  const asset = await uploadAsset(file, 'RESUME');
  const previous = await prisma.resumeAsset.findMany({ select: { assetId: true } });
  await prisma.$transaction([
    prisma.resumeAsset.deleteMany({}),
    prisma.resumeAsset.create({ data: { assetId: asset.id, isActive: true } }),
  ]);
  await releaseAssets(previous.map((p) => p.assetId));
  return (await getAdmin())!;
}

export async function remove() {
  const previous = await prisma.resumeAsset.findMany({ select: { assetId: true } });
  await prisma.resumeAsset.deleteMany({});
  await releaseAssets(previous.map((p) => p.assetId));
}
