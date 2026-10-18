import { describe, expect, it } from 'vitest';
import { formatBytes, formatDateRange, formatFullDate, formatMonthYear, initials, isImage, paragraphs } from './format';

describe('date formatting', () => {
  it('formats plain dates in UTC so they never shift by a day', () => {
    expect(formatMonthYear('2026-03-01')).toBe('Mar 2026');
    expect(formatFullDate('2026-03-01')).toBe('March 1, 2026');
    expect(formatMonthYear('2026-12-31')).toBe('Dec 2026');
  });

  it('returns an empty string for missing or invalid dates (nothing is invented)', () => {
    expect(formatMonthYear(null)).toBe('');
    expect(formatMonthYear('not a date')).toBe('');
  });

  it('builds date ranges', () => {
    expect(formatDateRange('2026-01-01', '2026-03-01', false)).toBe('Jan 2026 — Mar 2026');
    expect(formatDateRange('2026-01-01', null, true)).toBe('Jan 2026 — Present');
    expect(formatDateRange('2026-01-15', '2026-01-30', false)).toBe('Jan 2026');
    expect(formatDateRange(null, null, false)).toBe('');
  });
});

describe('text helpers', () => {
  it('formats file sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('splits paragraphs on blank lines and drops empties', () => {
    expect(paragraphs('One.\n\nTwo.\n\n\n\nThree.\n')).toEqual(['One.', 'Two.', 'Three.']);
    expect(paragraphs('  ')).toEqual([]);
  });

  it('makes initials from a title', () => {
    expect(initials('Skill Connect Nepal')).toBe('SC');
    expect(initials('SmartBite')).toBe('S');
  });

  it('recognises images', () => {
    expect(isImage('image/png')).toBe(true);
    expect(isImage('application/pdf')).toBe(false);
  });
});
