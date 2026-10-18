import { z } from 'zod';

const COMMON_PASSWORDS = new Set([
  'password1234',
  'passwordpassword',
  '123456789012',
  'qwertyuiopas',
  'administrator',
  'letmein123456',
  'welcome12345',
  'iloveyou1234',
]);

/** Length over composition (NIST SP 800-63B): 12–128 characters, not a trivially common password. */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), 'That password is too common.')
  .refine((p) => new Set(p).size >= 5, 'Password is too repetitive.');

export const loginBody = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
