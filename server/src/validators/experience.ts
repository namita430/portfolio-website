import { z } from 'zod';
import { ExperienceType } from '@prisma/client';
import { optionalDate, optionalId, optionalText, tagNames, text } from './common';

export const experienceBody = z
  .object({
    type: z.enum(ExperienceType),
    title: text(200),
    organization: text(160),
    role: optionalText(160),
    location: optionalText(120),
    startDate: optionalDate,
    endDate: optionalDate,
    isCurrent: z.boolean().default(false),
    description: optionalText(5000),
    documentId: optionalId,
    tags: tagNames,
    isPublished: z.boolean().default(false),
  })
  .refine((v) => !(v.startDate && v.endDate) || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date cannot be before the start date.',
  })
  .transform((v) => (v.isCurrent ? { ...v, endDate: null } : v));
export type ExperienceBody = z.infer<typeof experienceBody>;
