import fs from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface StorageDriver {
  readonly name: string;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_.-]{2,200}$/;
function assertSafeKey(key: string) {
  if (!KEY_PATTERN.test(key) || key.includes('..') || key.includes('//')) {
    throw new Error('Unsafe storage key');
  }
}

const CACHE_CONTROL = 'public, max-age=31536000, immutable'; // keys are random + never reused

const baseUrl = env.STORAGE_PUBLIC_BASE_URL.replace(/\/+$/, '');

/** Development-only driver. Refused in production by env validation (ephemeral disks lose files). */
export const LOCAL_UPLOAD_DIR = path.resolve(process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

class LocalDriver implements StorageDriver {
  readonly name = 'local';
  async put(key: string, body: Buffer) {
    assertSafeKey(key);
    const target = path.join(LOCAL_UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
  }
  async delete(key: string) {
    assertSafeKey(key);
    await fs.rm(path.join(LOCAL_UPLOAD_DIR, key), { force: true });
  }
  publicUrl(key: string) {
    return `${baseUrl}/${key}`;
  }
}

/** Any S3-compatible service: Cloudflare R2, Backblaze B2, Supabase Storage, MinIO, AWS S3. */
class S3Driver implements StorageDriver {
  readonly name = 's3';
  private client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });
  async put(key: string, body: Buffer, contentType: string) {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: CACHE_CONTROL,
        ContentDisposition: 'inline',
      }),
    );
  }
  async delete(key: string) {
    assertSafeKey(key);
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }));
    } catch (err) {
      // A leftover object is harmless; never fail a request because cleanup failed.
      logger.warn({ key, err: (err as Error).message }, 'storage delete failed');
    }
  }
  publicUrl(key: string) {
    return `${baseUrl}/${key}`;
  }
}

export const storage: StorageDriver = env.STORAGE_DRIVER === 's3' ? new S3Driver() : new LocalDriver();
