/**
 * Browser test of the PUBLIC site: layouts at phone / tablet / desktop widths, accessibility basics,
 * keyboard use, reduced motion. Read-only (it does not change any data).
 *
 *   E2E_BASE_URL=http://localhost:5173 node public.test.mjs        (start the API and the client first)
 */
import path from 'node:path';
import { BASE, launch, shotsDir, stepRunner } from './lib.mjs';

const browser = await launch();
const problems = [];

async function audit(page, label) {
  const info = await page.evaluate(() => {
    const doc = document.documentElement;
    const imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(-40));
    const unnamed = [...document.querySelectorAll('button, a[href]')]
      .filter((el) => !((el.getAttribute('aria-label') || el.textContent || '').trim() || el.querySelector('img[alt]:not([alt=""])')))
      .map((el) => el.outerHTML.slice(0, 90));
    // Elements sticking out past the right edge, ignoring intentional scrollers, fixed layers and decoration.
    const insideScroller = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    const widest = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= doc.clientWidth + 1) return false;
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') return false;
        if (el.closest('[aria-hidden="true"]') && !el.closest('main p, main h1')) return false;
        if (el.closest('.sr-only') || /-left-\[9999px\]/.test(String(el.className))) return false;
        return !insideScroller(el);
      })
      .slice(0, 4)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 50)} right=${Math.round(el.getBoundingClientRect().right)}`);
    return { overflowX: doc.scrollWidth > doc.clientWidth + 1, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, h1: document.querySelectorAll('h1').length, imgsNoAlt, unnamed, widest, title: document.title, lang: doc.lang };
  });
  if (info.overflowX) problems.push(`${label}: horizontal overflow (${info.scrollWidth} > ${info.clientWidth})`);
  if (!info.overflowX && info.widest.length) problems.push(`${label}: content pushed past the screen edge: ${info.widest.join(' | ')}`);
  if (info.h1 !== 1) problems.push(`${label}: expected 1 <h1>, found ${info.h1}`);
  if (info.imgsNoAlt.length) problems.push(`${label}: images without an alt attribute: ${info.imgsNoAlt.join(', ')}`);
  if (info.unnamed.length) problems.push(`${label}: controls without an accessible name: ${info.unnamed.join(' || ')}`);
  if (!info.lang) problems.push(`${label}: <html> has no lang attribute`);
  return info;
}

async function visit(width, height, name, url, expectedErrorUrls = []) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url().slice(0, 100)));
  page.on('response', (r) => r.status() >= 400 && !expectedErrorUrls.some((u) => r.url().includes(u)) && errors.push(`http ${r.status()}: ${r.url().slice(0, 100)}`));
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  const total = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += height * 0.7) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(100); // lets scroll-reveal animations run
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await audit(page, name);
  await page.screenshot({ path: path.join(shotsDir, `${name}.png`), fullPage: true });
  if (errors.length) problems.push(`${name}: ${errors.join(' ; ')}`);
  return { page, ctx };
}

const pages = [
  [1440, 900, 'home-desktop', '/'],
  [768, 1024, 'home-tablet', '/'],
  [390, 844, 'home-phone', '/'],
  [1440, 900, 'projects-desktop', '/projects'],
  [390, 844, 'projects-phone', '/projects'],
  [1440, 900, 'project-detail-desktop', '/projects/smartbite'],
  [390, 844, 'project-detail-phone', '/projects/smartbite'],
];
for (const [w, h, name, url] of pages) {
  const { ctx } = await visit(w, h, name, url);
  await ctx.close();
}
for (const [name, url, expected] of [['not-found-project', '/projects/does-not-exist', '/projects/does-not-exist'], ['not-found-page', '/nope/nothing', '']]) {
  const { ctx } = await visit(1440, 900, name, url, expected ? [expected] : []);
  await ctx.close();
}

// ---- interaction checks
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const { step, summary } = stepRunner(page);
await page.goto(BASE + '/', { waitUntil: 'networkidle' });

await step('first Tab stop is the "Skip to content" link', async () => {
  await page.keyboard.press('Tab');
  const t = await page.evaluate(() => document.activeElement?.textContent?.trim());
  if (!/skip/i.test(t || '')) throw new Error(`first focus is "${t}"`);
});
await step('hero code window tabs switch and show real data', async () => {
  await page.getByRole('tab', { name: 'stack.ts' }).click();
  await page.waitForTimeout(900);
  if (!/frontend/i.test(await page.getByRole('tabpanel').innerText())) throw new Error('stack.ts shows no skills');
});
await step('code window tabs work with the arrow keys', async () => {
  await page.getByRole('tab', { name: 'stack.ts' }).focus();
  await page.keyboard.press('ArrowRight');
  if ((await page.getByRole('tab', { selected: true }).innerText()) !== 'projects.ts') throw new Error('ArrowRight did not select the next tab');
});
await step('nav link scrolls the Skills section to just below the header', async () => {
  await page.getByRole('link', { name: 'Skills', exact: true }).first().click();
  await page.waitForTimeout(1200);
  const y = await page.evaluate(() => Math.round(document.getElementById('skills').getBoundingClientRect().top));
  if (Math.abs(y - 88) > 60) throw new Error(`section top is ${y}px (expected about 88)`);
});
await step('sections are numbered consecutively and empty sections are hidden', async () => {
  const eyebrows = await page.locator('section[data-section] .eyebrow').allInnerTexts();
  const nums = eyebrows.map((t) => /^(\d\d)/.exec(t)?.[1]).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n, i) => n !== i + 1)) throw new Error(`section numbers: ${nums}`);
});
await step('the mobile menu opens, lists the links, and closes with Escape', async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await m.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Open menu' }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(shotsDir, 'phone-menu-open.png') });
  const links = await p.locator('#mobile-menu a').allInnerTexts();
  if (links.length < 3) throw new Error('menu has too few links: ' + links);
  await p.keyboard.press('Escape');
  if ((await p.getByRole('button', { name: /menu/i }).first().getAttribute('aria-expanded')) !== 'false') throw new Error('Escape did not close the menu');
  await m.close();
});
await step('reduced motion: roles are shown statically', async () => {
  const r = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await r.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  const text = await p.locator('main p.font-mono').first().innerText();
  await r.close();
  if (!text.includes('·')) throw new Error('roles are not listed statically: ' + text.slice(0, 80));
});
await step('every theme switches the page colours', async () => {
  for (const theme of ['ember', 'jade', 'indigo', 'rose', 'paper']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (!bg || bg === 'rgba(0, 0, 0, 0)') throw new Error(`theme ${theme} has no background`);
  }
  await page.evaluate(() => (document.documentElement.dataset.theme = 'ember'));
});

await ctx.close();
await browser.close();

console.log('\n=== LAYOUT / ACCESSIBILITY PROBLEMS (' + problems.length + ') ===');
problems.forEach((p) => console.log('- ' + p));
const failed = summary();
process.exit(failed || problems.length ? 1 : 0);
