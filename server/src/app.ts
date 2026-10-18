import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiters';
import { requireTrustedOrigin } from './middleware/auth';
import { LOCAL_UPLOAD_DIR } from './services/storage';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Number of reverse proxies in front of the API (Render: 1). Required for correct req.ip / rate limiting.
  app.set('trust proxy', env.TRUST_PROXY);

  // Development only: serve locally stored uploads. (Production requires S3-compatible storage.)
  if (!env.isProd && env.STORAGE_DRIVER === 'local') {
    app.use(
      '/uploads',
      express.static(LOCAL_UPLOAD_DIR, {
        index: false,
        dotfiles: 'deny',
        setHeaders: (res) => {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      }),
    );
  }

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/v1/health') ?? false },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      // Log method + path only: no headers, cookies, query strings or bodies.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: String(req.url).split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // This is a JSON API: lock everything down. (The SPA's own CSP/headers are set by Netlify.)
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: env.isProd ? { maxAge: 63_072_000, includeSubDomains: true } : false,
    }),
  );

  // Strict CORS: only the exact origins in FRONTEND_ORIGINS may make credentialed browser requests.
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || env.frontendOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      maxAge: 600,
    }),
  );

  app.use(globalLimiter);
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  app.use('/api/v1', requireTrustedOrigin, apiRouter);

  app.get('/', (_req, res) => {
    res.json({ name: 'Namita Giri portfolio API', version: 'v1', docs: '/api/v1/health' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
