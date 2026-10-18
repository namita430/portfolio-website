import type { ThemeName } from '@/types/api';

export const THEMES: Array<{ id: ThemeName; label: string; description: string; swatch: string; bg: string }> = [
  { id: 'ember', label: 'Ember', description: 'Charcoal with a warm amber accent (default)', swatch: '#f0a63a', bg: '#0e0f11' },
  { id: 'jade', label: 'Jade', description: 'Deep green-black with a mint accent', swatch: '#4fd1a5', bg: '#0c1110' },
  { id: 'indigo', label: 'Indigo', description: 'Blue-black with a soft periwinkle accent', swatch: '#9aa5ff', bg: '#0d0e14' },
  { id: 'rose', label: 'Rose', description: 'Plum-black with a coral-rose accent', swatch: '#ff7f8f', bg: '#110e10' },
  { id: 'paper', label: 'Paper', description: 'Warm light theme with a terracotta accent', swatch: '#9c4312', bg: '#f6f2ea' },
];

const STORAGE_KEY = 'portfolio-theme';
const isTheme = (v: unknown): v is ThemeName => THEMES.some((t) => t.id === v);

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  const color = THEMES.find((t) => t.id === theme)?.bg;
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  try {
    localStorage.setItem(STORAGE_KEY, theme); // a per-visitor convenience only: avoids a flash on the next visit
  } catch {
    /* storage unavailable (private mode) — theme still applies for this visit */
  }
}

/** Runs before React renders so the last-used theme is painted immediately. */
export function initTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) document.documentElement.dataset.theme = stored;
  } catch {
    /* ignore */
  }
}
