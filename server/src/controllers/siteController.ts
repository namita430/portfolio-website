import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import * as profileService from '../services/profileService';
import * as resumeService from '../services/resumeService';
import * as skillService from '../services/skillService';
import * as experienceService from '../services/experienceService';
import { noCache, ok } from '../utils/http';

/** Everything the layout needs on first paint: profile, display settings, resume (if any). */
export async function getSite(_req: Request, res: Response) {
  const [profile, settings, resume] = await Promise.all([
    profileService.getProfile(),
    profileService.getSettings(),
    resumeService.getPublic(),
  ]);
  noCache(res);
  ok(res, { profile, settings, resume });
}

export async function getSkills(_req: Request, res: Response) {
  noCache(res);
  ok(res, await skillService.listPublic());
}

export async function getExperience(_req: Request, res: Response) {
  noCache(res);
  ok(res, await experienceService.listPublic());
}

export async function getResume(_req: Request, res: Response) {
  noCache(res);
  ok(res, await resumeService.getPublic());
}

/** Liveness: does not touch the database (safe for platform health checks). */
export function health(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, { status: 'ok', time: new Date().toISOString() });
}

/** Readiness: verifies the MySQL connection. Returns 503 if the database is unreachable. */
export async function ready(_req: Request, res: Response) {
  await prisma.$queryRaw`SELECT 1`;
  res.setHeader('Cache-Control', 'no-store');
  ok(res, { status: 'ready', database: 'up' });
}
