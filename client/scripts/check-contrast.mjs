/**
 * Verifies WCAG contrast for every theme defined in src/styles/index.css.
 *   node scripts/check-contrast.mjs
 * Exits non-zero if any required pair falls below its target ratio.
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/index.css', import.meta.url), 'utf8');

const themeBlocks = [...css.matchAll(/:root(?:,\s*:root)?\[data-theme='(\w+)'\]\s*\{([^}]+)\}/g)].map((m) => [m[1], m[2]]);
if (!themeBlocks.length) throw new Error('No themes found');

const parseVars = (block) =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

function toRgb(value, bg) {
  const v = value.trim();
  if (v.startsWith('#')) {
    const h = v.slice(1);
    const n = h.length === 3 ? [...h].map((c) => c + c) : h.match(/../g);
    return n.map((x) => parseInt(x, 16));
  }
  const m = v.match(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\)/);
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    const a = m[4] === undefined ? 1 : Number(m[4]);
    return [r, g, b].map((c, i) => Math.round(c * a + bg[i] * (1 - a))); // composite over background
  }
  throw new Error(`Unsupported colour: ${value}`);
}
const lum = ([r, g, b]) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// The first :root block (ember) is the default; collect it plus every named theme.
const base = parseVars(css.match(/:root,\s*:root\[data-theme='ember'\]\s*\{([^}]+)\}/)[1]);
const themes = new Map([['ember', base]]);
for (const [name, block] of themeBlocks) themes.set(name, { ...base, ...parseVars(block) });

/**
 * Background specs: "surface" (an opaque variable), "accent-soft" (a translucent variable, composited over the page),
 * "accent-soft/surface" (…composited over another variable) or "success@0.1/surface" (a solid colour at 10% opacity
 * over another variable — how the status chips are drawn).
 */
function resolveBg(vars, spec, pageBg) {
  const m = /^([\w-]+)(?:@([\d.]+))?(?:\/([\w-]+))?$/.exec(spec);
  if (!m) throw new Error(`Bad background spec ${spec}`);
  const [, name, alpha, base] = m;
  const baseRgb = base ? toRgb(vars[base], pageBg) : pageBg;
  if (alpha === undefined) return toRgb(vars[name], baseRgb);
  const top = toRgb(vars[name], baseRgb);
  return top.map((c, i) => Math.round(c * Number(alpha) + baseRgb[i] * (1 - Number(alpha))));
}

const checks = [
  ['body text on page', 'fg', 'bg', 4.5],
  ['body text on cards', 'fg', 'surface', 4.5],
  ['body text on raised surfaces', 'fg', 'surface-2', 4.5],
  ['muted text on page', 'muted', 'bg', 4.5],
  ['muted text on cards', 'muted', 'surface', 4.5],
  ['muted text on raised surfaces', 'muted', 'surface-2', 4.5],
  ['subtle text on page', 'subtle', 'bg', 4.5],
  ['subtle text on cards', 'subtle', 'surface', 4.5],
  ['accent text/links on page', 'accent', 'bg', 4.5],
  ['accent text on cards', 'accent', 'surface', 4.5],
  ['accent text on raised surfaces', 'accent', 'surface-2', 4.5],
  ['accent text on its tint (badges, icon tiles) over the page', 'accent', 'accent-soft', 4.5],
  ['accent text on its tint over cards', 'accent', 'accent-soft/surface', 4.5],
  ['button label on accent', 'accent-fg', 'accent', 4.5],
  ['danger text on cards', 'danger', 'surface', 4.5],
  ['danger text on its tint (error chips)', 'danger', 'danger@0.1/surface', 4.5],
  ['success text on cards', 'success', 'surface', 4.5],
  ['success text on its tint (status chips)', 'success', 'success@0.1/surface', 4.5],
  ['UI border (strong) on page', 'line-strong', 'bg', 1.4], // decorative separators only
];

let failed = 0;
for (const [name, vars] of themes) {
  const bg = toRgb(vars.bg, [0, 0, 0]);
  console.log(`\n${name}`);
  for (const [label, fgKey, bgKey, min] of checks) {
    const bgc = resolveBg(vars, bgKey, bg);
    const fgc = toRgb(vars[fgKey], bgc);
    const r = ratio(fgc, bgc);
    const ok = r >= min;
    if (!ok) failed += 1;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (need ${min})  ${label}`);
  }
}
console.log(failed ? `\n${failed} contrast check(s) FAILED` : '\nAll theme contrast checks passed.');
process.exit(failed ? 1 : 0);
