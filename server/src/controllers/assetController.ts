import type { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { created, noContent, ok } from '../utils/http';
import * as assets from '../services/assetService';

export async function upload(req: Request, res: Response) {
  const asset = await assets.uploadAsset(req.file, req.validated.body.purpose);
  created(res, assets.serializeAsset(asset));
}

export async function remove(req: Request, res: Response) {
  const id = req.validated.params.id;
  if (await assets.isAssetReferenced(id)) {
    throw AppError.conflict('This file is still used by published or draft content and cannot be deleted.');
  }
  await assets.deleteAssetIfUnreferenced(id);
  noContent(res);
}

/** Deletes uploads that were never attached to anything (older than an hour). */
export async function cleanup(_req: Request, res: Response) {
  ok(res, await assets.cleanupOrphans(60));
}
