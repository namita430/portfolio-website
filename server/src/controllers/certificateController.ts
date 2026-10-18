import type { Request, Response } from 'express';
import * as certificates from '../services/certificateService';
import { created, noCache, noContent, ok, pageMeta } from '../utils/http';
import { applyOrder } from '../services/helpers';

export async function listPublic(req: Request, res: Response) {
  const q = req.validated.query;
  const { total, items, categories } = await certificates.listPublic(q);
  noCache(res);
  ok(res, items, { ...pageMeta(q.page, q.pageSize, total), categories });
}

export async function listAdmin(req: Request, res: Response) {
  const q = req.validated.query;
  const { total, items } = await certificates.listAdmin(q);
  ok(res, items, pageMeta(q.page, q.pageSize, total));
}

export async function getAdmin(req: Request, res: Response) {
  ok(res, await certificates.getAdmin(req.validated.params.id));
}

export async function create(req: Request, res: Response) {
  created(res, await certificates.create(req.validated.body));
}

export async function update(req: Request, res: Response) {
  ok(res, await certificates.update(req.validated.params.id, req.validated.body));
}

export async function publish(req: Request, res: Response) {
  ok(res, await certificates.setPublished(req.validated.params.id, req.validated.body.isPublished));
}

export async function feature(req: Request, res: Response) {
  ok(res, await certificates.setFeatured(req.validated.params.id, req.validated.body.isFeatured));
}

export async function reorder(req: Request, res: Response) {
  await applyOrder('certificate', req.validated.body.ids);
  noContent(res);
}

export async function remove(req: Request, res: Response) {
  await certificates.remove(req.validated.params.id);
  noContent(res);
}
