import type { Request, Response } from 'express';
import { env } from '../config/env';
import * as authService from '../services/authService';
import { clearCookieOptions, destroySession, sessionCookieOptions } from '../services/sessionService';
import { noContent, ok } from '../utils/http';

export async function login(req: Request, res: Response) {
  const { username, password } = req.validated.body;
  const result = await authService.login(username, password, { ip: req.ip, userAgent: req.get('user-agent') });
  res.cookie(env.sessionCookieName, result.session.token, sessionCookieOptions());
  res.setHeader('Cache-Control', 'no-store');
  ok(res, { user: result.user, csrfToken: result.session.csrfToken, expiresAt: result.session.expiresAt });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[env.sessionCookieName];
  if (typeof token === 'string') await destroySession(token);
  res.clearCookie(env.sessionCookieName, clearCookieOptions());
  res.setHeader('Cache-Control', 'no-store');
  noContent(res);
}

export function me(req: Request, res: Response) {
  const { user, session } = req.auth!;
  ok(res, { user, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.validated.body;
  await authService.changePassword(req.auth!.user.id, req.auth!.session.id, currentPassword, newPassword);
  noContent(res);
}
