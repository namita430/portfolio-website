import { hash, verify } from '@node-rs/argon2';

// Argon2id with OWASP's minimum recommended parameters (19 MiB memory, t=2, p=1).
const ARGON_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, ARGON_OPTIONS);

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
