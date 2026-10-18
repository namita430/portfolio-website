import { z } from 'zod';
import { optionalDate, optionalId, optionalText, optionalUrl, paginationQuery, queryBool, searchQuery, text } from './common';

export const certificateBody = z.object({
  title: text(200),
  issuer: text(160),
  issueDate: optionalDate,
  credentialId: optionalText(120),
  verificationUrl: optionalUrl,
  description: optionalText(3000),
  category: text(80),
  fileId: optionalId,
  thumbnailId: optionalId,
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});
export type CertificateBody = z.infer<typeof certificateBody>;

export const publicCertificatesQuery = paginationQuery.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(60),
  q: searchQuery,
  category: z.string().trim().max(80).optional(),
  featured: queryBool,
});
