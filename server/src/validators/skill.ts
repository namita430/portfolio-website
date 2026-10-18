import { z } from 'zod';
import { optionalText, text } from './common';

/** Keys understood by the client's icon map. */
export const SKILL_ICONS = [
  'code',
  'layout',
  'server',
  'database',
  'wrench',
  'sparkles',
  'palette',
  'globe',
  'cpu',
  'video',
] as const;

export const skillCategoryBody = z.object({
  name: text(80),
  description: optionalText(300),
  icon: z.enum(SKILL_ICONS).default('code'),
  isVisible: z.boolean().default(true),
});

export const skillBody = z.object({
  categoryId: z.number().int().positive(),
  name: text(80),
  note: optionalText(80),
  isVisible: z.boolean().default(true),
});
