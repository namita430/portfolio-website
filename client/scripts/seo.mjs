/**
 * Post-build SEO step (runs automatically after `vite build`, see "postbuild" in package.json).
 *
 *  - Fills the absolute URLs in dist/index.html (canonical, og:url, og:image) from VITE_SITE_URL.
 *    If VITE_SITE_URL is not set, those tags are removed rather than left pointing nowhere.
 *  - Writes dist/robots.txt (blocks /admin) and, when VITE_SITE_URL is set, dist/sitemap.xml.
 *    When VITE_API_BASE_URL is an absolute URL the sitemap also lists the published projects
 *    (best effort: if the API is asleep or unreachable the build still succeeds with the base pages).
 *
 * Environment (set in your Netlify site settings):
 *   VITE_SITE_URL      e.g. https://yourname.com.np   (no trailing slash)
 *   VITE_API_BASE_URL  e.g. https://api.yourname.com.np/api/v1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const siteUrl = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
const apiBase = (process.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('[seo] dist/index.html not found — run `vite build` first.');
  process.exit(1);
}
if (siteUrl && !/^https?:\/\/[^\s/]+$/i.test(siteUrl)) {
  console.error(`[seo] VITE_SITE_URL must look like https://example.com (got "${siteUrl}").`);
  process.exit(1);
}

// ---- index.html
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (siteUrl) {
  html = html.replaceAll('__SITE_URL__', siteUrl);
} else {
  html = html
    .split('\n')
    .filter((line) => !line.includes('__SITE_URL__'))
    .join('\n');
  console.warn('[seo] VITE_SITE_URL is not set: canonical / og:url / og:image tags were removed and no sitemap is written.');
}
fs.writeFileSync(indexPath, html);

// ---- robots.txt
const robots = ['User-agent: *', 'Allow: /', 'Disallow: /admin', ...(siteUrl ? ['', `Sitemap: ${siteUrl}/sitemap.xml`] : []), ''].join('\n');
fs.writeFileSync(path.join(dist, 'robots.txt'), robots);

// ---- sitemap.xml
if (siteUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${siteUrl}/`, priority: '1.0' },
    { loc: `${siteUrl}/projects`, priority: '0.8' },
  ];

  if (/^https?:\/\//i.test(apiBase)) {
    try {
      // Free-tier APIs can take about a minute to wake up, so allow for that.
      const res = await fetch(`${apiBase}/projects?pageSize=100`, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      for (const p of body.data ?? []) urls.push({ loc: `${siteUrl}/projects/${encodeURIComponent(p.slug)}`, priority: '0.7' });
      console.log(`[seo] sitemap includes ${body.data?.length ?? 0} project page(s).`);
    } catch (err) {
      console.warn(`[seo] could not fetch projects for the sitemap (${err.message}); writing base pages only.`);
    }
  } else {
    console.warn('[seo] VITE_API_BASE_URL is not an absolute URL, so project pages are not listed in the sitemap.');
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`),
    '</urlset>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
}

console.log('[seo] done.');
