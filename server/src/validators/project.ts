import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';
import {
  optionalDate,
  optionalId,
  optionalText,
  optionalUrl,
  paginationQuery,
  queryBool,
  searchQuery,
  tagNames,
  text,
} from './common';

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.')
  .nullish()
  .transform((v) => v || null);

export const projectBody = z.object({
  title: text(160),
  slug,
  tagline: optionalText(200),
  shortDescription: text(320),
  description: text(10_000),
  category: text(80),
  status: z.enum(ProjectStatus).default('IN_PROGRESS'),
  githubUrl: optionalUrl,
  liveUrl: optionalUrl,
  features: z.array(text(300)).max(30).default([]),
  challenges: z
    .array(z.object({ challenge: text(600), solution: text(1500) }))
    .max(20)
    .default([]),
  lessonsLearned: optionalText(5000),
  publishedAt: optionalDate,
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  coverImageId: optionalId,
  screenshots: z
    .array(z.object({ assetId: z.number().int().positive(), altText: optionalText(200) }))
    .max(24)
    .default([])
    .refine((s) => new Set(s.map((x) => x.assetId)).size === s.length, 'A screenshot was added twice.'),
  tags: tagNames,
});
export type ProjectBody = z.infer<typeof projectBody>;

export const publicProjectsQuery = paginationQuery.extend({
  q: searchQuery,
  category: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(80).optional(),
  featured: queryBool,
  sort: z.enum(['order', 'newest']).default('order'),
});

export const slugParam = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const adminListQuery = paginationQuery.extend({
  q: searchQuery,
  status: z.enum(['all', 'published', 'draft']).default('all'),
});
