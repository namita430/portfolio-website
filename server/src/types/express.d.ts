import type { AdminUser, Session } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Output of the `validate()` middleware (Express 5 makes req.query read-only). */
      validated: {
        body?: any;
        query?: any;
        params?: any;
      };
      /** Set by `requireAuth` for authenticated admin requests. */
      auth?: {
        user: Pick<AdminUser, 'id' | 'username' | 'displayName'>;
        session: Pick<Session, 'id' | 'csrfToken' | 'expiresAt'>;
      };
    }
  }
}

export {};
