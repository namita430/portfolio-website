/**
 * Automated accessibility audit with axe-core (WCAG 2.0/2.1 level A and AA rules) of the public pages in every
 * colour theme and, when admin credentials are supplied, of every dashboard page.
 * Read-only. Automated tools find roughly a third of real-world accessibility problems — this does not replace
 * a manual keyboard / screen-reader pass.
 *
 *   E2E_ADMIN_USER=… E2E_ADMIN_PASSWORD=… node a11y.test.mjs     (admin pages are skipped without credentials)
 */
import { createRequire } from 'node:module';
import { BASE, launch } from './lib.mjs';

const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const THEMES = ['ember', 'jade', 'indigo', 'rose', 'paper'];

const browser = await launch();
let total = 0;
const report = [];

async function settle(page) {
  // run scroll-reveal animations and wait for them to finish so contrast is measured on final colours
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
}

async function scan(page, label) {
  await page.addScriptTag({ path: axeSource });
  const result = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] }), TAGS);
  total += result.violations.length;
  const status = result.violations.length ? 'FAIL' : 'PASS';
  console.log(`${status} ${label}${result.violations.length ? `  (${result.violations.length} rule(s) violated)` : ''}`);
  for (const v of result.violations) {
    const first = v.nodes[0];
    report.push(`${label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} element(s)) e.g. ${first.target.join(' ')} :: ${(first.failureSummary || '').split('\n').slice(1, 3).join(' ').trim().slice(0, 200)}`);
  }
}

// ---- public pages, every theme
for (const [name, url] of [['home', '/'], ['projects', '/projects'], ['project detail', '/projects/smartbite'], ['not found', '/nope']]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  for (const theme of THEMES) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
    await settle(page);
    await scan(page, `public · ${name} · ${theme}`);
  }
  await ctx.close();
}

// the phone layout too (default theme)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await settle(page);
  await scan(page, 'public · home · phone');
  await ctx.close();
}

// ---- admin pages
const user = process.env.E2E_ADMIN_USER;
const pass = process.env.E2E_ADMIN_PASSWORD;
if (user && pass) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await scan(page, 'admin · sign-in');
  await page.getByLabel('Username', { exact: true }).fill(user);
  await page.getByLabel('Password', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Overview', level: 1 }).waitFor({ timeout: 15000 });
  for (const [name, route] of [
    ['overview', '/admin'], ['projects', '/admin/projects'], ['new project', '/admin/projects/new'], ['certificates', '/admin/certificates'],
    ['new certificate', '/admin/certificates/new'], ['journey', '/admin/journey'], ['new journey entry', '/admin/journey/new'], ['profile', '/admin/profile'],
    ['skills', '/admin/skills'], ['resume', '/admin/resume'], ['messages', '/admin/messages'], ['settings', '/admin/settings'], ['account', '/admin/account'],
  ]) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await scan(page, `admin · ${name}`);
  }
  await ctx.close();
} else {
  console.log('SKIP admin pages (set E2E_ADMIN_USER and E2E_ADMIN_PASSWORD to include them)');
}

await browser.close();
console.log(`\n${total} accessibility rule violation(s) found`);
report.forEach((r) => console.log('- ' + r));
process.exit(total ? 1 : 0);
