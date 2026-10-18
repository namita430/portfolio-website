import multer from 'multer';
import { env } from '../config/env';

/**
 * Accepts a single multipart field named "file", buffered in memory (max of the image/document limits).
 * Real validation (magic bytes, extension, per-purpose size) happens in assetService.
 */
export const singleFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(env.uploadMaxImageBytes, env.uploadMaxDocumentBytes),
    files: 1,
    fields: 10,
    fieldSize: 1024,
    parts: 12,
  },
}).single('file');
