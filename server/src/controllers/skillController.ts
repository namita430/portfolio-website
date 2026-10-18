import type { Request, Response } from 'express';
import * as skills from '../services/skillService';
import { created, noContent, ok } from '../utils/http';
import { applyOrder } from '../services/helpers';

export async function listAdmin(_req: Request, res: Response) {
  ok(res, await skills.listAdmin());
}

export async function createCategory(req: Request, res: Response) {
  created(res, await skills.createCategory(req.validated.body));
}

export async function updateCategory(req: Request, res: Response) {
  ok(res, await skills.updateCategory(req.validated.params.id, req.validated.body));
}

export async function removeCategory(req: Request, res: Response) {
  await skills.removeCategory(req.validated.params.id);
  noContent(res);
}

export async function reorderCategories(req: Request, res: Response) {
  await applyOrder('skillCategory', req.validated.body.ids);
  noContent(res);
}

export async function createSkill(req: Request, res: Response) {
  created(res, await skills.createSkill(req.validated.body));
}

export async function updateSkill(req: Request, res: Response) {
  ok(res, await skills.updateSkill(req.validated.params.id, req.validated.body));
}

export async function removeSkill(req: Request, res: Response) {
  await skills.removeSkill(req.validated.params.id);
  noContent(res);
}

export async function reorderSkills(req: Request, res: Response) {
  await applyOrder('skill', req.validated.body.ids);
  noContent(res);
}
