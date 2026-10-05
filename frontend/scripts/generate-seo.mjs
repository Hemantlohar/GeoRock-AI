// Generates public/sitemap.xml and public/robots.txt from VITE_SITE_URL.
// Runs automatically before `npm run build` (see "prebuild" in package.json).
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// tiny .env reader so this works without extra dependencies
const env = { ...process.env };
for (const f of ['.env.production', '.env']) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const site = (env.VITE_SITE_URL || 'https://your-domain.example').replace(/\/$/, '');
if (site.includes('your-domain.example')) console.warn('\n⚠  VITE_SITE_URL is not set — sitemap/robots use a placeholder domain.\n');

const pages = [
  { path: '/', priority: '1.0', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
];
const today = new Date().toISOString().slice(0, 10);

writeFileSync(resolve(root, 'public/sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${site}${p.path}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`).join('\n')}
</urlset>
`);
writeFileSync(resolve(root, 'public/robots.txt'),
`User-agent: *
Allow: /
Disallow: /dashboard

Sitemap: ${site}/sitemap.xml
`);
console.log(`SEO files written for ${site}`);
