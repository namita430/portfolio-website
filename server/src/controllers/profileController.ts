import type { Request, Response } from 'express';
import * as profile from '../services/profileService';
import * as resume from '../services/resumeService';
import * as overview from '../services/overviewService';
import * as tags from '../services/tagService';
import { noContent, ok } from '../utils/http';

export async function getProfile(_req: Request, res: Response) {
  ok(res, await profile.getProfile());
}

export async function updateProfile(req: Request, res: Response) {
  ok(res, await profile.updateProfile(req.validated.body));
}

export async function getSettings(_req: Request, res: Response) {
  ok(res, await profile.getSettings());
}

export async function updateSettings(req: Request, res: Response) {
  ok(res, await profile.updateSettings(req.validated.body));
}

export async function getResume(_req: Request, res: Response) {
  ok(res, await resume.getAdmin());
}

export async function replaceResume(req: Request, res: Response) {
  ok(res, await resume.replace(req.file));
}

export async function removeResume(_req: Request, res: Response) {
  await resume.remove();
  noContent(res);
}

export async function getOverview(_req: Request, res: Response) {
  ok(res, await overview.getOverview());
}

export async function listTags(_req: Request, res: Response) {
  ok(res, await tags.listAll());
}
