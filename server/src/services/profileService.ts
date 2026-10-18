import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { assertAsset, releaseAssets, serializeAsset } from './assetService';
import type { ProfileBody, SettingsBody } from '../validators/profile';

type ProfileFull = Prisma.ProfileGetPayload<{ include: { profileImage: true } }>;

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function serializeProfile(p: ProfileFull) {
  return {
    fullName: p.fullName,
    titles: asArray<string>(p.titles),
    introduction: p.introduction,
    objective: p.objective,
    aboutTitle: p.aboutTitle,
    aboutBody: p.aboutBody,
    aboutHighlights: asArray<{ label: string; value: string }>(p.aboutHighlights),
    location: p.location,
    email: p.email,
    githubUrl: p.githubUrl,
    linkedinUrl: p.linkedinUrl,
    profileImage: p.profileImage ? serializeAsset(p.profileImage) : null,
    updatedAt: p.updatedAt,
  };
}

export async function getProfile() {
  const profile = await prisma.profile.findUnique({ where: { id: 1 }, include: { profileImage: true } });
  if (!profile) throw new AppError(503, 'SERVICE_UNAVAILABLE', 'The site has not been set up yet.');
  return serializeProfile(profile);
}

export async function updateProfile(body: ProfileBody) {
  await assertAsset(body.profileImageId, ['image'], 'Profile image');
  const existing = await prisma.profile.findUnique({ where: { id: 1 } });
  const saved = await prisma.profile.upsert({
    where: { id: 1 },
    create: { id: 1, ...body },
    update: body,
    include: { profileImage: true },
  });
  await releaseAssets([existing?.profileImageId]);
  return serializeProfile(saved);
}

const DEFAULT_VISIBILITY = { about: true, skills: true, projects: true, certificates: true, journey: true, contact: true };

function serializeSettings(s: Prisma.SiteSettingsGetPayload<object>) {
  return {
    siteTitle: s.siteTitle,
    siteDescription: s.siteDescription,
    heroHeadline: s.heroHeadline,
    heroSubtext: s.heroSubtext,
    theme: s.theme,
    sectionVisibility: { ...DEFAULT_VISIBILITY, ...((s.sectionVisibility as object) ?? {}) },
    footerText: s.footerText,
    showResumeButton: s.showResumeButton,
    updatedAt: s.updatedAt,
  };
}

export async function getSettings() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!settings) throw new AppError(503, 'SERVICE_UNAVAILABLE', 'The site has not been set up yet.');
  return serializeSettings(settings);
}

export async function updateSettings(body: SettingsBody) {
  const saved = await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...body },
    update: body,
  });
  return serializeSettings(saved);
}
