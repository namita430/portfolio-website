import { describe, expect, it } from 'vitest';
import { preValidate } from './FileUpload';

const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type });

describe('upload pre-validation (instant feedback; the server re-validates everything)', () => {
  it('accepts allowed images for covers', () => {
    expect(preValidate(file('a.png', 'image/png'), 'PROJECT_COVER')).toBeNull();
    expect(preValidate(file('a.jpg', 'image/jpeg'), 'PROJECT_COVER')).toBeNull();
    expect(preValidate(file('a.webp', 'image/webp'), 'PROJECT_COVER')).toBeNull();
  });

  it('rejects PDFs for image-only purposes and images for the resume', () => {
    expect(preValidate(file('a.pdf', 'application/pdf'), 'PROJECT_COVER')).toMatch(/Unsupported/);
    expect(preValidate(file('a.png', 'image/png'), 'RESUME')).toMatch(/Unsupported/);
  });

  it('accepts a PDF for certificates and the resume', () => {
    expect(preValidate(file('c.pdf', 'application/pdf'), 'CERTIFICATE')).toBeNull();
    expect(preValidate(file('cv.pdf', 'application/pdf'), 'RESUME')).toBeNull();
  });

  it.each([
    ['evil.svg', 'image/svg+xml'],
    ['run.exe', 'application/octet-stream'],
    ['page.html', 'text/html'],
    ['photo.png.exe', 'image/png'],
  ])('rejects %s', (name, type) => {
    expect(preValidate(file(name, type), 'CERTIFICATE')).toMatch(/Unsupported/);
  });

  it('enforces size limits', () => {
    expect(preValidate(file('big.png', 'image/png', 9 * 1024 * 1024), 'PROJECT_COVER')).toMatch(/limit/);
    expect(preValidate(file('big.pdf', 'application/pdf', 11 * 1024 * 1024), 'RESUME')).toMatch(/limit/);
    expect(preValidate(file('ok.pdf', 'application/pdf', 9 * 1024 * 1024), 'RESUME')).toBeNull();
  });
});
