import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { safeEqual } from '../utils/text';
import { resolveSession } from '../services/sessionService';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Requires a valid server-side session (HTTP-only cookie). Every protected route is wrapped with this;
 * hiding the /admin UI route is NOT treated as a security measure.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[env.sessionCookieName];
  if (typeof token !== 'string' || token.length < 20) throw AppError.unauthenticated();

  const session = await resolveSession(token);
  if (!session) throw AppError.unauthenticated('Your session has expired. Please sign in again.');

  req.auth = {
    user: session.user,
    session: { id: session.id, csrfToken: session.csrfToken, expiresAt: session.expiresAt },
  };
  res.setHeader('Cache-Control', 'no-store');
  next();
};

/**
 * CSRF defence for state-changing admin requests: the SPA must echo the per-session token
 * (obtained from /auth/login or /auth/me, kept in memory only) in `X-CSRF-Token`.
 * A cross-site attacker can neither read nor set this header.
 */
export const requireCsrf: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const provided = req.get('x-csrf-token');
  if (!provided || !req.auth || !safeEqual(provided, req.auth.session.csrfToken)) {
    throw AppError.forbidden('Missing or invalid CSRF token.');
  }
  next();
};

/**
 * Second layer of CSRF defence: browsers always attach `Origin` to cross-origin and to
 * state-changing requests. If it is present it must be one of FRONTEND_ORIGINS.
 */
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !env.frontendOrigins.includes(origin)) throw AppError.forbidden('Origin not allowed.');
  next();
};
