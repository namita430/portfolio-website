import { z } from 'zod';
import { paginationQuery, searchQuery, text } from './common';

export const contactBody = z.object({
  name: text(120, 2),
  email: z.email('Enter a valid email address.').max(190),
  subject: text(200, 3),
  message: text(5000, 10),
  /** Honeypot: real users never see or fill this field. */
  website: z.string().max(200).optional(),
  /** Epoch ms when the form was rendered; used for a minimum-fill-time check. */
  startedAt: z.number().int().optional(),
  turnstileToken: z.string().max(2048).optional(),
});
export type ContactBody = z.infer<typeof contactBody>;

export const messagesQuery = paginationQuery.extend({
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
  status: z.enum(['all', 'unread', 'read']).default('all'),
  q: searchQuery,
});

export const messagePatchBody = z.object({ isRead: z.boolean() });
