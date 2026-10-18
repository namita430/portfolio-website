import type { Request, Response } from 'express';
import * as contact from '../services/contactService';
import { created, noContent, ok, pageMeta } from '../utils/http';

export async function submit(req: Request, res: Response) {
  const result = await contact.submit(req.validated.body, { ip: req.ip });
  res.setHeader('Cache-Control', 'no-store');
  created(res, result);
}

export async function listAdmin(req: Request, res: Response) {
  const q = req.validated.query;
  const { total, unread, items } = await contact.listAdmin(q);
  ok(res, items, { ...pageMeta(q.page, q.pageSize, total), unread });
}

export async function setRead(req: Request, res: Response) {
  ok(res, await contact.setRead(req.validated.params.id, req.validated.body.isRead));
}

export async function remove(req: Request, res: Response) {
  await contact.remove(req.validated.params.id);
  noContent(res);
}
