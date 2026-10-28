/**
 * Writes a page for every address the site answers into dist/: the home page, each city, its list,
 * its neighbourhoods and its cafés. Each is the built index.html with that page's title, description,
 * canonical link, link previews, structured data and the app's first render filled in, so search
 * engines and link previews see the content without running the app. Also writes the sitemap,
 * robots.txt and a 404 page. `npm run build` runs it after `vite build`.
 *
 *   SITE_URL=https://example.com node tools/prerender.mjs     (defaults to config.site)
 */
import { Window } from 'happy-dom';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const template = readFileSync(join(dist, 'index.html'), 'utf8');
if (template.includes('application/ld+json')) throw new Error('dist/index.html is already a built page; run vite build first');

// Vite loads the TypeScript views and data exactly as the app sees them.
const vite = await createServer({ root, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false } });
let site;
try {
  const { buildSite } = await vite.ssrLoadModule('/src/seo/prerender.ts');
  site = buildSite(process.env.SITE_URL);
} finally {
  await vite.close();
}

const window = new Window({
  settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true },
});

/** The template with a page's head and first render in place. */
function fill({ title, head, mode, sheet, regions = {} }) {
  const doc = new window.DOMParser().parseFromString(template, 'text/html');
  const titleEl = doc.querySelector('title');
  titleEl.textContent = title;
  doc.querySelector('meta[name="description"]')?.remove();
  const tags = doc.createElement('template');
  tags.innerHTML = head;
  titleEl.after(...tags.content.childNodes);
  if (mode) doc.body.dataset.mode = mode;
  if (sheet) doc.body.dataset.sheet = sheet;
  for (const [id, markup] of Object.entries(regions)) {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`index.html has no #${id}`);
    el.innerHTML = markup;
  }
  return `<!doctype html>\n${doc.documentElement.outerHTML}\n`;
}

const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};

for (const page of site.pages) write(join(dist, page.path, 'index.html'), fill(page));
write(join(dist, '404.html'), fill(site.notFound));
for (const [name, text] of Object.entries(site.files)) write(join(dist, name), text);
await window.happyDOM.close();
console.log(`prerendered ${site.pages.length} pages and ${Object.keys(site.files).join(', ')}`);
