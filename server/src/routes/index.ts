import { Router } from 'express';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { adminRoutes } from './adminRoutes';

/** Mounted at /api/v1 */
export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/', publicRoutes);
