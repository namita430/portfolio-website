/**
 * Browser test of the ADMIN DASHBOARD against a running dev stack. It signs in, creates/edits/publishes/deletes
 * projects, certificates, journey entries and skills, uploads files, changes the profile/theme/section visibility
 * (and puts them back), sends a message through the public contact form and manages it in the inbox, then signs out.
 *
 * !! It MODIFIES DATA. Run it only against a development/test database. !!
 *
 *   E2E_ADMIN_USER=… E2E_ADMIN_PASSWORD=… node admin.test.mjs
 *
 * Notes: the API rate-limits sign-ins (10 per 15 minutes per address; this test signs in 3 times), so avoid running
 * it more than three times within 15 minutes, or restart the dev API to reset the counters.
 */
import path from 'node:path';
import { BASE, credentials, guardLocal, launch, makePdf, makePng, shotsDir, stepRunner } from './lib.mjs';

guardLocal();
const creds = credentials();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(9000);
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 220)));
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 220)));

const { step, summary } = stepRunner(page);
const stamp = Date.now();
const MESSAGE_SUBJECT = `E2E hello ${stamp}`;
const pdf = makePdf();

const toast = (re) => page.locator('[aria-live="polite"] [role="status"], [aria-live="polite"] [role="alert"]').filter({ hasText: re }).first().waitFor({ timeout: 8000 });
const expectText = async (loc, re) => {
  await loc.waitFor();
  const t = await loc.innerText();
  if (!re.test(t)) throw new Error(`expected ${re} but got "${t.slice(0, 120)}"`);
};
const publicHas = async (urlPath, text) => {
  const p = await ctx.newPage();
  await p.goto(BASE + urlPath, { waitUntil: 'networkidle' });
  const ok = (await p.locator('body').innerText()).includes(text);
  await p.close();
  return ok;
};
const apiStatus = async (urlPath) => (await ctx.request.get(BASE + urlPath)).status();
const png = (w, h, rgb) => makePng(w, h, rgb);

// ---------------------------------------------------------------- authentication
await step('anonymous /admin shows the login screen (no dashboard)', async () => {
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Admin sign in' }).waitFor();
  if (await page.getByRole('link', { name: 'Projects' }).count()) throw new Error('dashboard navigation visible while signed out');
});
await step('anonymous deep link /admin/projects also shows the login screen', async () => {
  await page.goto(BASE + '/admin/projects', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Admin sign in' }).waitFor();
});
await step('a wrong password is rejected with a clear message', async () => {
  await page.getByLabel('Username', { exact: true }).fill(creds.user);
  await page.getByLabel('Password', { exact: true }).fill('definitely-wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expectText(page.getByRole('alert').filter({ hasText: /invalid/i }), /invalid username or password/i);
  await page.screenshot({ path: path.join(shotsDir, 'login-error.png') });
});
await step('the correct password signs in and returns to the requested page', async () => {
  await page.getByLabel('Password', { exact: true }).fill(creds.pass);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Projects', level: 1 }).waitFor({ timeout: 10000 });
});
await step('the session cookie is HttpOnly and nothing sensitive is in web storage', async () => {
  const sid = (await ctx.cookies()).find((c) => c.name === 'sid' || c.name === '__Host-sid');
  if (!sid) throw new Error('no session cookie');
  if (!sid.httpOnly) throw new Error('session cookie is NOT HttpOnly');
  const stored = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
  if (/csrf|token|sid|session/i.test(stored.replace(/portfolio-theme/g, ''))) throw new Error('auth data in web storage: ' + stored.slice(0, 200));
});
await step('a page reload keeps the session (CSRF token re-fetched from /auth/me)', async () => {
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Projects', level: 1 }).waitFor({ timeout: 10000 });
});
await step('pre-flight: no leftover E2E records from an earlier failed run', async () => {
  for (const [resource, key] of [['projects', 'title'], ['certificates', 'title']]) {
    const res = await ctx.request.get(`${BASE}/api/v1/admin/${resource}?q=E2E&pageSize=50`);
    const body = await res.json();
    const left = (body.data ?? []).filter((x) => String(x[key]).startsWith('E2E'));
    if (left.length) throw new Error(`delete the leftover ${resource} named "${left[0][key]}" first`);
  }
});
await step('the overview page shows counts', async () => {
  await page.getByRole('link', { name: 'Overview' }).first().click();
  await page.getByRole('heading', { name: 'Overview', level: 1 }).waitFor();
  await page.getByText('Unread messages').waitFor();
  await page.screenshot({ path: path.join(shotsDir, 'admin-overview.png') });
});

// ---------------------------------------------------------------- projects
let projectUrl = '';
await step('create a project with cover, screenshot, tags and a feature, published', async () => {
  await page.goto(BASE + '/admin/projects/new', { waitUntil: 'networkidle' });
  await page.getByLabel(/^Title/).fill('E2E Test Project');
  await page.getByLabel('Short description').fill('A project created by the automated browser test.');
  await page.getByLabel('Detailed description').fill('First paragraph of the description.\n\nSecond paragraph.');
  await page.getByLabel('Category').fill('Testing');
  await page.getByLabel('GitHub repository URL').fill('https://github.com/namita430/portfolio-website');
  const tags = page.locator('#tags');
  for (const t of ['React', 'Vite']) {
    await tags.fill(t);
    await tags.press('Enter');
  }
  await page.getByRole('button', { name: 'Add feature' }).click();
  await page.getByLabel('Feature 1', { exact: true }).fill('Created through the admin form');
  const files = page.locator('input[type=file]');
  await files.nth(0).setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png(800, 500, [200, 120, 40]) });
  await page.getByText('cover.png').first().waitFor({ timeout: 10000 });
  await files.nth(1).setInputFiles({ name: 'shot1.png', mimeType: 'image/png', buffer: png(900, 560, [40, 120, 200]) });
  await page.getByLabel(/Description \(alt text\)/).first().fill('First screenshot');
  await page.getByRole('switch', { name: 'Published' }).click();
  await page.screenshot({ path: path.join(shotsDir, 'admin-project-form.png'), fullPage: true });
  await page.getByRole('button', { name: 'Create project' }).first().click();
  await toast(/Project created/);
  await page.waitForURL(/\/admin\/projects\/\d+$/, { timeout: 8000 });
  projectUrl = page.url();
});
await step('invalid input shows field errors and does not save', async () => {
  await page.goto(BASE + '/admin/projects/new', { waitUntil: 'networkidle' });
  await page.getByLabel('GitHub repository URL').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Create project' }).first().click();
  await page.getByText('Title is required.').waitFor();
  await page.getByText(/full link starting with http/i).waitFor();
});
await step('the new project is public, with its cover image loaded and its tags', async () => {
  const p = await ctx.newPage();
  await p.goto(BASE + '/projects/e2e-test-project', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'E2E Test Project', level: 1 }).waitFor();
  const loaded = await p.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  const hasTags = (await p.locator('body').innerText()).includes('Vite');
  await p.screenshot({ path: path.join(shotsDir, 'public-new-project.png'), fullPage: true });
  await p.close();
  if (!loaded) throw new Error('an image on the public project page failed to load');
  if (!hasTags) throw new Error('tags are not shown');
});
await step('editing the title updates the public page immediately', async () => {
  await page.goto(projectUrl, { waitUntil: 'networkidle' });
  await page.getByLabel(/^Title/).fill('E2E Test Project (edited)');
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Project saved/);
  if (!(await publicHas('/projects/e2e-test-project', 'E2E Test Project (edited)'))) throw new Error('public page not updated');
});
await step('the preview dialog shows unsaved edits without publishing them', async () => {
  await page.getByLabel(/^Title/).fill('Preview Only Title');
  await page.getByRole('button', { name: 'Preview' }).first().click();
  await page.getByRole('dialog', { name: 'Project preview' }).getByRole('heading', { name: 'Preview Only Title' }).waitFor();
  await page.screenshot({ path: path.join(shotsDir, 'admin-project-preview.png') });
  await page.getByRole('button', { name: 'Close preview' }).click();
  if (await publicHas('/projects/e2e-test-project', 'Preview Only Title')) throw new Error('the preview leaked into the public site');
  await page.getByLabel(/^Title/).fill('E2E Test Project (edited)');
});
await step('unpublishing hides the project from the public API (404) and republishing restores it', async () => {
  await page.goto(BASE + '/admin/projects', { waitUntil: 'networkidle' });
  await page.getByRole('switch', { name: /Published: E2E Test Project/ }).click();
  await toast(/Unpublished/);
  const s = await apiStatus('/api/v1/projects/e2e-test-project');
  if (s !== 404) throw new Error('unpublished project still served: HTTP ' + s);
  await page.getByRole('switch', { name: /Published: E2E Test Project/ }).click();
  await toast(/Published\./);
  if ((await apiStatus('/api/v1/projects/e2e-test-project')) !== 200) throw new Error('republishing did not restore it');
});
await step('reordering moves a project and the list follows', async () => {
  await page.goto(BASE + '/admin/projects', { waitUntil: 'networkidle' });
  const before = await page.locator('main ul > li a.block').allInnerTexts();
  const idx = before.findIndex((t) => t.startsWith('E2E Test Project'));
  if (idx < 0) throw new Error('test project not in the list');
  await page.getByRole('button', { name: /^Move E2E Test Project.* down$/ }).click();
  await page.waitForTimeout(1200);
  const after = await page.locator('main ul > li a.block').allInnerTexts();
  if (after.findIndex((t) => t.startsWith('E2E Test Project')) !== idx + 1) throw new Error(`order unchanged: ${before} -> ${after}`);
  await page.getByRole('button', { name: /^Move E2E Test Project.* up$/ }).click();
  await page.waitForTimeout(800);
});
await step('the feature toggle works', async () => {
  await page.getByRole('button', { name: /^Feature E2E Test Project/ }).click();
  await page.getByRole('button', { name: /^Unfeature E2E Test Project/ }).waitFor({ timeout: 6000 });
});

// ---------------------------------------------------------------- certificates
let certId = '';
await step('a certificate cannot be published without a file or verification link', async () => {
  await page.goto(BASE + '/admin/certificates/new', { waitUntil: 'networkidle' });
  await page.getByLabel(/^Title/).fill('E2E Certificate');
  await page.getByLabel('Issuing organisation').fill('E2E Academy');
  await page.getByLabel('Category').fill('Testing');
  await page.getByRole('switch', { name: 'Published' }).click();
  await page.getByRole('button', { name: 'Create certificate' }).first().click();
  await page.getByText(/Upload the certificate file or add a verification URL/).first().waitFor();
  if (await page.getByRole('heading', { name: 'Edit certificate' }).count()) throw new Error('saved despite the guard');
});
await step('saved as a draft it is hidden; with a verification link it publishes and the section appears', async () => {
  await page.getByRole('switch', { name: 'Published' }).click();
  await page.getByRole('button', { name: 'Create certificate' }).first().click();
  await toast(/Certificate created/);
  await page.waitForURL(/\/admin\/certificates\/\d+$/);
  certId = page.url().split('/').pop();
  const body = await (await ctx.request.get(BASE + '/api/v1/certificates')).json();
  if (body.data.some((c) => c.title === 'E2E Certificate')) throw new Error('draft certificate leaked publicly');
  await page.getByLabel('Verification URL').fill('https://example.com/verify/e2e');
  await page.getByRole('switch', { name: 'Published' }).click();
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Certificate saved/);
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.locator('#certificates').scrollIntoViewIfNeeded();
  const txt = await p.locator('#certificates').innerText();
  await p.screenshot({ path: path.join(shotsDir, 'public-certificates.png') });
  await p.close();
  if (!txt.includes('E2E Certificate')) throw new Error('the published certificate is not on the home page');
});
await step('a PDF certificate opens in the accessible lightbox and Escape closes it', async () => {
  await page.goto(BASE + '/admin/certificates/' + certId, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'cert.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.getByText('cert.pdf').first().waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Certificate saved/);
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Preview certificate: E2E Certificate/ }).click();
  const dlg = p.getByRole('dialog', { name: 'Certificate preview' });
  await dlg.waitFor();
  const iframes = await dlg.locator('iframe').count();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  const stillOpen = await p.locator('dialog[open]').count();
  await p.close();
  if (!iframes) throw new Error('the PDF preview is missing');
  if (stillOpen) throw new Error('Escape did not close the lightbox');
});
await step('deleting the certificate removes it and the public section disappears', async () => {
  await page.goto(BASE + '/admin/certificates', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Delete E2E Certificate' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete certificate' }).click();
  await toast(/Certificate deleted/);
  const body = await (await ctx.request.get(BASE + '/api/v1/certificates')).json();
  if (body.data.some((c) => c.title === 'E2E Certificate')) throw new Error('certificate still public after deleting it');
});

// ---------------------------------------------------------------- journey, skills
await step('journey: create an entry, see it publicly, delete it', async () => {
  await page.goto(BASE + '/admin/journey/new', { waitUntil: 'networkidle' });
  await page.getByLabel(/^Title/).fill('E2E Workshop');
  await page.getByLabel('Organisation').fill('E2E Org');
  await page.locator('#tags').fill('Testing');
  await page.locator('#tags').press('Enter');
  await page.getByRole('switch', { name: 'Published' }).click();
  await page.getByRole('button', { name: 'Create entry' }).first().click();
  await toast(/Entry created/);
  if (!(await publicHas('/', 'E2E Workshop'))) throw new Error('the journey entry is not on the public site');
  await page.goto(BASE + '/admin/journey', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Delete E2E Workshop' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete entry' }).click();
  await toast(/Entry deleted/);
});
await step('skills: add a category and a skill, see it publicly, delete the category', async () => {
  await page.goto(BASE + '/admin/skills', { waitUntil: 'networkidle' });
  await page.getByLabel('New category name').fill('E2E Category');
  await page.getByRole('button', { name: 'Add category' }).click();
  await toast(/Category added/);
  await page.locator('input[id^="new-skill-"]').last().fill('E2E Skill');
  await page.getByRole('button', { name: 'Add', exact: true }).last().click();
  await toast(/Skill added/);
  if (!(await publicHas('/', 'E2E Skill'))) throw new Error('the new skill is not shown publicly');
  await page.getByRole('button', { name: 'Delete category E2E Category' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete category' }).click();
  await toast(/Category deleted/);
});

// ---------------------------------------------------------------- profile and settings (changed, then restored)
await step('profile: change the location, the public site updates, then restore it', async () => {
  await page.goto(BASE + '/admin/profile', { waitUntil: 'networkidle' });
  const loc = page.getByLabel('Location');
  const original = await loc.inputValue();
  await loc.fill('Kathmandu, Nepal');
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Profile saved/);
  const changed = await publicHas('/', 'Kathmandu, Nepal');
  await loc.fill(original);
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Profile saved/);
  if (!changed) throw new Error('the public site did not show the new location');
});
await step('settings: switch to the Jade theme, the public site uses it, then restore', async () => {
  await page.goto(BASE + '/admin/settings', { waitUntil: 'networkidle' });
  const originalTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole('radio', { name: /Jade/ }).click();
  if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== 'jade') throw new Error('the theme did not preview live');
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Settings saved/);
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  const t = await p.evaluate(() => document.documentElement.dataset.theme);
  await p.screenshot({ path: path.join(shotsDir, 'public-jade.png') });
  await p.close();
  await page.getByRole('radio', { name: new RegExp(originalTheme === 'ember' || !originalTheme ? 'Ember' : originalTheme, 'i') }).click();
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Settings saved/);
  if (t !== 'jade') throw new Error('the public theme is ' + t);
});
await step('settings: hiding Skills removes the section and its nav link, then restore', async () => {
  await page.getByRole('switch', { name: 'Skills' }).click();
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Settings saved/);
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  const has = await p.locator('#skills').count();
  const navHas = await p.locator('nav[aria-label="Primary"] a', { hasText: 'Skills' }).count();
  await p.close();
  await page.getByRole('switch', { name: 'Skills' }).click();
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await toast(/Settings saved/);
  if (has || navHas) throw new Error('Skills is still visible while switched off');
});

// ---------------------------------------------------------------- resume
await step('resume: hidden until uploaded, wrong type refused, download appears, removal hides it', async () => {
  const heroLinks = async () => {
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const n = await p.getByRole('link', { name: /Resume/ }).count();
    await p.close();
    return n;
  };
  await page.goto(BASE + '/admin/resume', { waitUntil: 'networkidle' });
  const existing = await page.getByText('No resume uploaded').count();
  if (!existing) throw new Error('a resume already exists — remove it first so this test can restore the original state');
  if (await heroLinks()) throw new Error('a resume button is visible although no resume is uploaded');
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: png(10, 10, [1, 2, 3]) });
  await toast(/Unsupported file type/);
  await page.locator('input[type=file]').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: pdf });
  await toast(/Resume uploaded/);
  if (!(await heroLinks())) throw new Error('the resume button did not appear after uploading');
  await page.screenshot({ path: path.join(shotsDir, 'admin-resume.png') });
  await page.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove resume' }).click();
  await toast(/Resume removed/);
  if (await heroLinks()) throw new Error('the resume button is still visible after removal');
});

// ---------------------------------------------------------------- contact form -> inbox
await step('contact form: a visitor sends a message, it reaches the admin inbox and can be read and deleted', async () => {
  const p = await ctx.newPage();
  await p.goto(BASE + '/#contact', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3200); // the form needs a plausible human fill time
  await p.getByLabel('Name', { exact: true }).fill('Browser Tester');
  await p.getByLabel('Email', { exact: true }).fill('tester@example.com');
  await p.getByLabel('Subject').fill(MESSAGE_SUBJECT);
  await p.getByLabel('Message', { exact: true }).fill('This message was typed by the automated browser test.');
  await p.getByRole('button', { name: /Send message/ }).click();
  await p.getByRole('heading', { name: 'Message received' }).waitFor({ timeout: 8000 });
  await p.screenshot({ path: path.join(shotsDir, 'public-contact-success.png') });
  await p.close();
  await page.goto(BASE + '/admin/messages', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: new RegExp(MESSAGE_SUBJECT) }).click();
  await page.getByText('This message was typed by the automated browser test.').waitFor();
  await page.screenshot({ path: path.join(shotsDir, 'admin-messages.png') });
  await page.getByRole('button', { name: 'Delete message' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete message' }).click();
  await toast(/Message deleted/);
});
await step('contact form validation shows errors and sends nothing', async () => {
  const p = await ctx.newPage();
  await p.goto(BASE + '/#contact', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Send message/ }).click();
  await p.getByText('Please enter your name.').waitFor();
  await p.getByText('Enter a valid email address.').waitFor();
  await p.close();
});

// ---------------------------------------------------------------- clean-up, layout, sign-out
await step('delete the test project (and its uploaded files)', async () => {
  await page.goto(BASE + '/admin/projects', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Delete E2E Test Project/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete project' }).click();
  await toast(/Project deleted/);
  if ((await apiStatus('/api/v1/projects/e2e-test-project')) !== 404) throw new Error('the deleted project is still served');
});
await step('every dashboard page fits a phone screen without horizontal overflow', async () => {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await mobile.newPage();
  await p.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await p.getByLabel('Username', { exact: true }).fill(creds.user);
  await p.getByLabel('Password', { exact: true }).fill(creds.pass);
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.getByRole('heading', { name: 'Overview', level: 1 }).waitFor({ timeout: 10000 });
  const bad = [];
  for (const route of ['/admin', '/admin/projects', '/admin/projects/new', '/admin/certificates', '/admin/journey', '/admin/profile', '/admin/skills', '/admin/resume', '/admin/messages', '/admin/settings', '/admin/account']) {
    await p.goto(BASE + route, { waitUntil: 'networkidle' });
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (o.sw > o.cw + 1) bad.push(`${route} (${o.sw}>${o.cw})`);
  }
  await p.goto(BASE + '/admin/projects', { waitUntil: 'networkidle' });
  await p.screenshot({ path: path.join(shotsDir, 'admin-projects-phone.png') });
  await mobile.close();
  if (bad.length) throw new Error('overflow on: ' + bad.join(', '));
});
await step('signing out ends the session: the admin API answers 401 and the dashboard asks to sign in', async () => {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('heading', { name: 'Admin sign in' }).waitFor({ timeout: 8000 });
  const s = await apiStatus('/api/v1/admin/projects');
  if (s !== 401) throw new Error('admin API after sign-out: HTTP ' + s);
});

await browser.close();
const failed = summary();
const unexpected = [...new Set(consoleErrors)].filter((e) => !/status of (401|404|422|409)/.test(e));
console.log('unexpected browser console errors:', unexpected.length ? '\n - ' + unexpected.join('\n - ') : 'none');
process.exit(failed || unexpected.length ? 1 : 0);
