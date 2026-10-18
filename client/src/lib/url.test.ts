import { describe, expect, it } from 'vitest';
import { displayHost, safeHref } from './url';

describe('safeHref', () => {
  it('allows http and https links', () => {
    expect(safeHref('https://github.com/namita430')).toBe('https://github.com/namita430');
    expect(safeHref('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'mailto:a@b.com', 'ftp://example.com'])(
    'rejects the unsafe scheme %s (a stored link can never become an XSS href)',
    (url) => {
      expect(safeHref(url)).toBeUndefined();
    },
  );

  it('returns undefined for empty or missing values', () => {
    expect(safeHref(null)).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
    expect(safeHref('')).toBeUndefined();
  });
});

describe('displayHost', () => {
  it('shows a tidy hostname', () => {
    expect(displayHost('https://www.example.com/path')).toBe('example.com');
    expect(displayHost('https://vocal-sprinkles-6b716c.netlify.app/login')).toBe('vocal-sprinkles-6b716c.netlify.app');
  });
  it('is empty for unsafe or missing links', () => {
    expect(displayHost('javascript:alert(1)')).toBe('');
    expect(displayHost(null)).toBe('');
  });
});
