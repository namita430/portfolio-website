import { z } from 'zod';
import { cleanText } from '../utils/text';

/** Required, cleaned text with length bounds (control characters stripped, whitespace trimmed). */
export const text = (max: number, min = 1) =>
  z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, min === 1 ? 'This field is required.' : `Must be at least ${min} characters.`)
        .max(max, `Must be at most ${max} characters.`),
    );

/** Optional text; empty string, null and undefined all become null. */
export const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => (v == null ? null : cleanText(v) || null))
    .pipe(z.string().max(max, `Must be at most ${max} characters.`).nullable());

const httpUrl = z
  .string()
  .max(500, 'URL is too long.')
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Must be a valid http:// or https:// URL.');

/**
 * Optional http(s) URL; empty/missing becomes null. Other schemes (javascript:, data:, ...) are
 * rejected to prevent XSS via href. (Built on nullish() so a missing key is allowed in Zod 4.)
 */
export const optionalUrl = z
  .string()
  .nullish()
  .transform((v) => (v == null ? null : v.trim() || null))
  .pipe(httpUrl.nullable());

/** Optional calendar date (YYYY-MM-DD), stored as UTC midnight. */
export const optionalDate = z
  .string()
  .nullish()
  .transform((v) => (v == null ? null : v.trim() || null))
  .pipe(z.iso.date('Use the format YYYY-MM-DD.').nullable())
  .transform((v) => (v ? new Date(`${v}T00:00:00.000Z`) : null));

export const optionalId = z.number().int().positive().nullish().transform((v) => v ?? null);

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export const searchQuery = z.string().trim().max(100).optional();

export const queryBool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const reorderBody = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, 'ids must be unique.'),
});

export const publishBody = z.object({ isPublished: z.boolean() });
export const featureBody = z.object({ isFeatured: z.boolean() });

/** Tag names: trimmed, de-duplicated case-insensitively, bounded. */
export const tagNames = z
  .array(text(60))
  .max(25)
  .default([])
  .transform((names) => {
    const seen = new Set<string>();
    return names.filter((n) => {
      const key = n.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
