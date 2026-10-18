import { Router } from 'express';
import { validate } from '../middleware/validate';
import { loginLimiter } from '../middleware/rateLimiters';
import { requireAuth, requireCsrf } from '../middleware/auth';
import * as auth from '../controllers/authController';
import { changePasswordBody, loginBody } from '../validators/auth';

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, validate({ body: loginBody }), auth.login);
authRoutes.post('/logout', auth.logout);
authRoutes.get('/me', requireAuth, auth.me);
authRoutes.post('/change-password', requireAuth, requireCsrf, validate({ body: changePasswordBody }), auth.changePassword);
