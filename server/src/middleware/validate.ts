import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates and coerces params, query and body. Results are placed on `req.validated`
 * (Express 5 exposes `req.query` as a read-only getter, so it cannot be overwritten).
 * A ZodError is thrown on failure and converted to a 422 by the central error handler.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    req.validated = {};
    if (schemas.params) req.validated.params = schemas.params.parse(req.params);
    if (schemas.query) req.validated.query = schemas.query.parse(req.query);
    if (schemas.body) req.validated.body = schemas.body.parse(req.body ?? {});
    next();
  };
}
