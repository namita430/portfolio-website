import { z } from 'zod';
import { optionalId, optionalText, optionalUrl, text } from './common';

export const THEMES = ['ember', 'jade', 'indigo', 'rose', 'paper'] as const;
export const SECTION_KEYS = ['about', 'skills', 'projects', 'certificates', 'journey', 'contact'] as const;

export const profileBody = z.object({
  fullName: text(120),
  titles: z.array(text(80)).min(1, 'Add at least one title.').max(8),
  introduction: text(1500),
  objective: optionalText(500),
  aboutTitle: text(160),
  aboutBody: text(6000),
  aboutHighlights: z.array(z.object({ label: text(40), value: text(120) })).max(8).default([]),
  location: text(120),
  email: z.email('Enter a valid email address.').max(190),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  profileImageId: optionalId,
});
export type ProfileBody = z.infer<typeof profileBody>;

export const settingsBody = z.object({
  siteTitle: text(160),
  siteDescription: text(320),
  heroHeadline: text(200),
  heroSubtext: text(500),
  theme: z.enum(THEMES),
  sectionVisibility: z.object(
    Object.fromEntries(SECTION_KEYS.map((k) => [k, z.boolean()])) as Record<(typeof SECTION_KEYS)[number], z.ZodBoolean>,
  ),
  footerText: text(300),
  showResumeButton: z.boolean(),
});
export type SettingsBody = z.infer<typeof settingsBody>;
