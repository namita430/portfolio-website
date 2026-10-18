import type { Request, Response } from 'express';
import * as projects from '../services/projectService';
import { created, noCache, noContent, ok, pageMeta } from '../utils/http';
import { applyOrder } from '../services/helpers';

// ---- public
export async function listPublic(req: Request, res: Response) {
  const q = req.validated.query;
  const { total, items } = await projects.listPublic(q);
  noCache(res);
  ok(res, items, pageMeta(q.page, q.pageSize, total));
}

export async function filters(_req: Request, res: Response) {
  noCache(res);
  ok(res, await projects.publicFilters());
}

export async function getBySlug(req: Request, res: Response) {
  noCache(res);
  ok(res, await projects.getPublicBySlug(req.validated.params.slug));
}

// ---- admin
export async function listAdmin(req: Request, res: Response) {
  const q = req.validated.query;
  const { total, items } = await projects.listAdmin(q);
  ok(res, items, pageMeta(q.page, q.pageSize, total));
}

export async function getAdmin(req: Request, res: Response) {
  ok(res, await projects.getAdmin(req.validated.params.id));
}

export async function create(req: Request, res: Response) {
  created(res, await projects.create(req.validated.body));
}

export async function update(req: Request, res: Response) {
  ok(res, await projects.update(req.validated.params.id, req.validated.body));
}

export async function publish(req: Request, res: Response) {
  ok(res, await projects.setPublished(req.validated.params.id, req.validated.body.isPublished));
}

export async function feature(req: Request, res: Response) {
  ok(res, await projects.setFeatured(req.validated.params.id, req.validated.body.isFeatured));
}

export async function reorder(req: Request, res: Response) {
  await applyOrder('project', req.validated.body.ids);
  noContent(res);
}

export async function remove(req: Request, res: Response) {
  await projects.remove(req.validated.params.id);
  noContent(res);
}
