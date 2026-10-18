import type { Request, Response } from 'express';
import * as experience from '../services/experienceService';
import { created, noContent, ok } from '../utils/http';
import { applyOrder } from '../services/helpers';

export async function listAdmin(_req: Request, res: Response) {
  ok(res, await experience.listAdmin());
}

export async function getAdmin(req: Request, res: Response) {
  ok(res, await experience.getAdmin(req.validated.params.id));
}

export async function create(req: Request, res: Response) {
  created(res, await experience.create(req.validated.body));
}

export async function update(req: Request, res: Response) {
  ok(res, await experience.update(req.validated.params.id, req.validated.body));
}

export async function publish(req: Request, res: Response) {
  ok(res, await experience.setPublished(req.validated.params.id, req.validated.body.isPublished));
}

export async function reorder(req: Request, res: Response) {
  await applyOrder('experienceEntry', req.validated.body.ids);
  noContent(res);
}

export async function remove(req: Request, res: Response) {
  await experience.remove(req.validated.params.id);
  noContent(res);
}
