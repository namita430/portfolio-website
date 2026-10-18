import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found.`));
};

function send(res: Parameters<ErrorRequestHandler>[2], status: number, code: string, message: string, details?: unknown) {
  res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}

/** Central error handler. Never leaks stack traces, SQL, or internal error messages. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return send(res, 422, 'VALIDATION_ERROR', 'Some fields are invalid.', details);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return send(res, 413, 'PAYLOAD_TOO_LARGE', 'The uploaded file is too large.');
    }
    return send(res, 400, 'BAD_REQUEST', 'The upload could not be processed.');
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return send(res, 409, 'CONFLICT', 'A record with that value already exists.');
    if (err.code === 'P2025') return send(res, 404, 'NOT_FOUND', 'Record not found.');
    if (err.code === 'P2003') {
      return send(res, 409, 'CONFLICT', 'This record is referenced by other data and cannot be changed that way.');
    }
  }

  // body-parser errors
  const type = (err as { type?: string })?.type;
  if (type === 'entity.too.large') return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  if (type === 'entity.parse.failed') return send(res, 400, 'BAD_REQUEST', 'Request body is not valid JSON.');

  // Database unreachable (e.g. free-tier instance powered off) -> 503 so clients can retry.
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P1002', 'P1017'].includes(err.code))
  ) {
    logger.error({ err: err.message }, 'database unavailable');
    return send(res, 503, 'SERVICE_UNAVAILABLE', 'The service is temporarily unavailable. Please try again shortly.');
  }

  logger.error({ err, method: req.method, url: req.originalUrl }, 'unhandled error');
  return send(
    res,
    500,
    'INTERNAL_ERROR',
    env.isProd ? 'Something went wrong on our side.' : `Internal error: ${(err as Error)?.message ?? 'unknown'}`,
  );
};
