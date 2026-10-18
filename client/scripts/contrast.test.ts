import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('colour themes', () => {
  it('every theme meets WCAG AA contrast (see scripts/check-contrast.mjs)', () => {
    const output = execFileSync('node', ['scripts/check-contrast.mjs'], { encoding: 'utf8' });
    expect(output).toContain('All theme contrast checks passed.');
    for (const theme of ['ember', 'jade', 'indigo', 'rose', 'paper']) expect(output).toContain(theme);
  });
});
