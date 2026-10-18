import type { Response } from 'express';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Consistent success envelope: { success: true, data, meta? } */
export function ok<T>(res: Response, data: T, meta?: object, status = 200) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, undefined, 201);
}

export function noContent(res: Response) {
  return res.status(204).end();
}

export function pageMeta(page: number, pageSize: number, total: number): PageMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Public, anonymous GET responses: always revalidate (ETag) so edits show up immediately. */
export function noCache(res: Response) {
  res.setHeader('Cache-Control', 'no-cache');
}
