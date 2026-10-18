import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import type { AssetPurpose, FileAsset } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import { storage } from './storage';

type DetectedType = { mime: string; ext: string; kind: 'image' | 'document'; allowedExtensions: string[] };

const TYPES: Record<string, DetectedType> = {
  png: { mime: 'image/png', ext: 'png', kind: 'image', allowedExtensions: ['.png'] },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', kind: 'image', allowedExtensions: ['.jpg', '.jpeg'] },
  webp: { mime: 'image/webp', ext: 'webp', kind: 'image', allowedExtensions: ['.webp'] },
  pdf: { mime: 'application/pdf', ext: 'pdf', kind: 'document', allowedExtensions: ['.pdf'] },
};

/** Identify the real file type from its leading bytes — never trust the client's name or MIME type. */
function detectType(buf: Buffer): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return TYPES.png;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return TYPES.jpeg;
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return TYPES.webp;
  if (buf.subarray(0, 5).toString('ascii') === '%PDF-') return TYPES.pdf;
  return null;
}

/** Which kinds of file each purpose accepts. */
const PURPOSE_RULES: Record<AssetPurpose, { kinds: Array<'image' | 'document'>; folder: string; maxDimension: number }> = {
  PROJECT_COVER: { kinds: ['image'], folder: 'projects', maxDimension: 2000 },
  PROJECT_IMAGE: { kinds: ['image'], folder: 'projects', maxDimension: 2400 },
  PROFILE: { kinds: ['image'], folder: 'profile', maxDimension: 1200 },
  CERTIFICATE: { kinds: ['image', 'document'], folder: 'certificates', maxDimension: 2400 },
  JOURNEY_DOC: { kinds: ['image', 'document'], folder: 'journey', maxDimension: 2400 },
  RESUME: { kinds: ['document'], folder: 'resume', maxDimension: 0 },
};

export const PURPOSES = Object.keys(PURPOSE_RULES) as AssetPurpose[];

export function serializeAsset(a: Pick<FileAsset, 'id' | 'url' | 'mimeType' | 'sizeBytes' | 'width' | 'height' | 'originalName'>) {
  return {
    id: a.id,
    url: a.url,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    width: a.width,
    height: a.height,
    originalName: a.originalName,
  };
}
export type PublicAsset = ReturnType<typeof serializeAsset>;

const safeDisplayName = (name: string) =>
  path.basename(name).replace(/[^\w.\- ()]+/g, '_').slice(0, 200) || 'file';

export async function uploadAsset(
  file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
  purpose: AssetPurpose,
) {
  if (!file) throw AppError.badRequest('No file was uploaded. Send it in a multipart field named "file".');
  const rule = PURPOSE_RULES[purpose];

  const detected = detectType(file.buffer);
  if (!detected) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type. Allowed: PNG, JPEG, WebP images and PDF documents.');
  }
  if (!rule.kinds.includes(detected.kind)) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', `This upload accepts only ${rule.kinds.join(' or ')} files.`);
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!detected.allowedExtensions.includes(ext)) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The file extension does not match the file contents.');
  }
  const declared = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
  if (declared !== detected.mime) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The declared file type does not match the file contents.');
  }

  const limit = detected.kind === 'image' ? env.uploadMaxImageBytes : env.uploadMaxDocumentBytes;
  if (file.buffer.length > limit) {
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', `File too large. Maximum is ${Math.round(limit / 1024 / 1024)} MB.`);
  }

  let body = file.buffer;
  let width: number | null = null;
  let height: number | null = null;

  if (detected.kind === 'image') {
    // Re-encode: strips EXIF/GPS metadata, applies orientation, bounds dimensions, and discards any
    // appended or polyglot payload because only decoded pixels are written back out.
    try {
      let pipeline = sharp(file.buffer, { failOn: 'error', limitInputPixels: 60_000_000 })
        .rotate()
        .resize({ width: rule.maxDimension, height: rule.maxDimension, fit: 'inside', withoutEnlargement: true });
      if (detected.ext === 'png') pipeline = pipeline.png({ compressionLevel: 9 });
      else if (detected.ext === 'webp') pipeline = pipeline.webp({ quality: 86 });
      else pipeline = pipeline.jpeg({ quality: 86, mozjpeg: true });
      const out = await pipeline.toBuffer({ resolveWithObject: true });
      body = out.data;
      width = out.info.width;
      height = out.info.height;
    } catch {
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The image could not be read. It may be corrupted.');
    }
  } else {
    // Best-effort PDF hygiene: must look like a complete PDF and must not carry active content.
    const tail = file.buffer.subarray(Math.max(0, file.buffer.length - 2048)).toString('latin1');
    if (!tail.includes('%%EOF')) throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The PDF appears to be incomplete or corrupted.');
    if (/\/(JavaScript|JS|Launch)\b/.test(file.buffer.toString('latin1'))) {
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'PDFs containing scripts or launch actions are not allowed.');
    }
  }

  const year = new Date().getUTCFullYear();
  const storageKey = `${rule.folder}/${year}/${crypto.randomBytes(16).toString('hex')}.${detected.ext}`;
  await storage.put(storageKey, body, detected.mime);

  try {
    return await prisma.fileAsset.create({
      data: {
        storageKey,
        url: storage.publicUrl(storageKey),
        originalName: safeDisplayName(file.originalname),
        mimeType: detected.mime,
        sizeBytes: body.length,
        width,
        height,
        purpose,
      },
    });
  } catch (err) {
    await storage.delete(storageKey); // don't leave an orphaned object behind
    throw err;
  }
}

/** Confirms an asset id exists and is an acceptable kind before it is linked to a record. */
export async function assertAsset(id: number | null | undefined, accept: Array<'image' | 'document'>, label: string) {
  if (id == null) return;
  const asset = await prisma.fileAsset.findUnique({ where: { id }, select: { mimeType: true } });
  if (!asset) throw AppError.validation(`${label}: the referenced file does not exist.`);
  const kind = asset.mimeType.startsWith('image/') ? 'image' : 'document';
  if (!accept.includes(kind)) throw AppError.validation(`${label}: unsupported file type (${asset.mimeType}).`);
}

export async function isAssetReferenced(id: number) {
  const refs = await Promise.all([
    prisma.project.count({ where: { coverImageId: id } }),
    prisma.projectImage.count({ where: { assetId: id } }),
    prisma.certificate.count({ where: { OR: [{ fileId: id }, { thumbnailId: id }] } }),
    prisma.experienceEntry.count({ where: { documentId: id } }),
    prisma.profile.count({ where: { profileImageId: id } }),
    prisma.resumeAsset.count({ where: { assetId: id } }),
  ]);
  return refs.some((n) => n > 0);
}

/** Deletes the stored object and its row only when nothing references it any more. */
export async function deleteAssetIfUnreferenced(id: number | null | undefined): Promise<boolean> {
  if (id == null) return false;
  try {
    if (await isAssetReferenced(id)) return false;
    const asset = await prisma.fileAsset.findUnique({ where: { id } });
    if (!asset) return false;
    await prisma.fileAsset.delete({ where: { id } });
    await storage.delete(asset.storageKey);
    return true;
  } catch (err) {
    logger.warn({ id, err: (err as Error).message }, 'asset cleanup skipped');
    return false;
  }
}

/** Call after a record stops pointing at old files (replace or delete). Best-effort, never throws. */
export async function releaseAssets(ids: Array<number | null | undefined>) {
  const unique = [...new Set(ids.filter((v): v is number => typeof v === 'number'))];
  for (const id of unique) await deleteAssetIfUnreferenced(id);
}

/** Removes uploads that were never attached to anything (e.g. abandoned form). */
export async function cleanupOrphans(olderThanMinutes = 60) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const orphans = await prisma.fileAsset.findMany({
    where: {
      createdAt: { lt: cutoff },
      projectCovers: { none: {} },
      projectImages: { none: {} },
      certFiles: { none: {} },
      certThumbs: { none: {} },
      journeyDocs: { none: {} },
      profileImages: { none: {} },
      resumes: { none: {} },
    },
    select: { id: true },
  });
  let removed = 0;
  for (const { id } of orphans) if (await deleteAssetIfUnreferenced(id)) removed += 1;
  return { found: orphans.length, removed };
}
