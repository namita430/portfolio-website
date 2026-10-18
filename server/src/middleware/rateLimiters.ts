import rateLimit, { type Options } from 'express-rate-limit';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

function limiter(opts: Partial<Options> & { windowMs: number; limit: number; message: string }) {
  const { message, ...rest } = opts;
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Counters live in process memory: fine for one API instance, reset on restart.
    skip: () => env.isTest && process.env.ENABLE_RATE_LIMIT_IN_TESTS !== 'true',
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', message)),
    ...rest,
  });
}

// A broad safety net only. It is generous on purpose: many visitors can share one network address (an office,
// a college), and a single page view makes several API calls. The sensitive endpoints below have their own,
// much tighter limits.
export const globalLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  message: 'Too many requests. Please slow down.',
});

export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many login attempts. Please try again in a few minutes.',
});

export const contactLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'You have sent several messages recently. Please try again later.',
});

export const uploadLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 120,
  message: 'Upload limit reached. Please try again later.',
});
