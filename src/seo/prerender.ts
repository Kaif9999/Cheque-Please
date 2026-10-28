import { config } from '@/config';
import { CITIES, CITY_ORDER } from '@/data/cities';
import type { Cafe } from '@/domain/types';
import { html, raw, type Html } from '@/lib/html';
import { renderDetail } from '@/ui/views/detail';
import { renderHero } from '@/ui/views/hero';
import { renderLegend } from '@/ui/views/legend';
import { renderList } from '@/ui/views/list';
import { renderCitySwitch, renderListPill, renderTopActions } from '@/ui/views/topbar';
import { allPages, canonicalOf, descriptionOf, headlineOf, imageOf, pathOf, titleOf, type Page } from './pages';
import { llmsFullTxt, llmsTxt } from './llms';
import { jsonForScript, schemaOf } from './schema';

/** One built page: where it goes, what its head says, and the app's first render of each region. */
export interface Rendered {
  path: string;
  title: string;
  /** Tags that go after the title: description, canonical link, link previews and structured data. */
  head: string;
  mode: 'intro' | 'map';
  sheet: 'open' | 'closed';
  /** Markup for each region of index.html, by element id. */
  regions: Record<string, string>;
}

/** The preview image's size, as tools/og.mjs renders it. */
const OG_SIZE = { width: 2400, height: 1260 };

/** The production origin with no trailing slash: SITE_URL when the build sets it, else the configured site. */
export function siteOrigin(override?: string): string {
  return (override || config.site).replace(/\/+$/, '');
}

function headOf(page: Page, site: string): Html {
  const canonical = `${site}${canonicalOf(page)}`;
  const description = descriptionOf(page);
  const headline = headlineOf(page);
  const image = imageOf(page);
  return html`
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${config.name}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${headline}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${site}${image.path}" />
    <meta property="og:image:width" content="${OG_SIZE.width}" />
    <meta property="og:image:height" content="${OG_SIZE.height}" />
    <meta property="og:image:alt" content="${image.alt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${headline}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${site}${image.path}" />
    <script type="application/ld+json">${raw(jsonForScript(schemaOf(page, site)))}</script>
  `;
}

/** What the side panel holds. On the cover it holds the closed list, so every café is one link away. */
function panelOf(page: Page): Html {
  if (page.kind === 'cafe') return renderDetail(page.city, page.cafe);
  if (page.kind === 'area') return renderList(page.city, null, page.area);
  return renderList(page.city, null);
}

export function renderPage(page: Page, site: string): Rendered {
  const { city } = page;
  const open = page.kind === 'list' || page.kind === 'area' || page.kind === 'cafe';
  return {
    path: pathOf(page),
    title: titleOf(page),
    head: headOf(page, site).toString(),
    mode: open ? 'map' : 'intro',
    sheet: open ? 'open' : 'closed',
    regions: {
      'hero-body': renderHero(city).toString(),
      'city-switch': renderCitySwitch(
        CITY_ORDER.map((id) => CITIES[id]),
        city.id,
      ).toString(),
      legend: renderLegend(city.cafes, null).toString(),
      'top-actions': renderTopActions(city).toString(),
      'list-pill': renderListPill(city).toString(),
      'sheet-body': panelOf(page).toString(),
    },
  };
}

/** The newest dated post among these cafés, as YYYY-MM-DD, for the sitemap. */
export function newestPost(cafes: Cafe[]): string | null {
  const times = cafes
    .flatMap((c) => [...c.vcs.map((v) => v.proof.date), ...c.scene.map((s) => s.date)])
    .map((d) => Date.parse(`${d} UTC`))
    .filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)).toISOString().slice(0, 10) : null;
}

function cafesOn(page: Page): Cafe[] {
  if (page.kind === 'home') return CITY_ORDER.flatMap((id) => CITIES[id].cafes);
  if (page.kind === 'area') return page.cafes;
  if (page.kind === 'cafe') return [page.cafe];
  return page.city.cafes;
}

/** Every canonical page, with the date of its newest post. The list pages point at their city, so they stay out. */
export function sitemap(pages: Page[], site: string): string {
  const urls = pages
    .filter((p) => p.kind !== 'list')
    .map((p) => {
      const lastmod = newestPost(cafesOn(p));
      return `  <url><loc>${site}${pathOf(p)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robots(site: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`;
}

/** Every page to write, and the plain files beside them, keyed by their path under dist/. */
export function buildSite(siteOverride?: string): {
  pages: Rendered[];
  notFound: { title: string; head: string };
  files: Record<string, string>;
} {
  const site = siteOrigin(siteOverride);
  const pages = allPages();
  const updated = newestPost(CITY_ORDER.flatMap((id) => CITIES[id].cafes));
  return {
    pages: pages.map((p) => renderPage(p, site)),
    notFound: { title: `Page not found · ${config.name}`, head: '<meta name="robots" content="noindex" />' },
    files: {
      'sitemap.xml': sitemap(pages, site),
      'robots.txt': robots(site),
      'llms.txt': llmsTxt(site, updated),
      'llms-full.txt': llmsFullTxt(site, updated),
    },
  };
}
