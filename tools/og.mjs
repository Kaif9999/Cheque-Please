/**
 * Renders the link-preview images at 1200×630 (2× for sharp text): each city's cover to
 * public/og/<city>.jpg, and the home page's to public/og.jpg, which asks the site-wide question
 * over the first city's map. Run against a server with the current build, then rebuild so dist/
 * picks them up:
 *
 *   npm run build && npm run preview & node tools/og.mjs --url http://127.0.0.1:4173/
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const i = process.argv.indexOf('--url');
const base = (i > -1 ? process.argv[i + 1] : 'http://127.0.0.1:4173/').replace(/#.*$/, '');
const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
const CITIES = ['bengaluru', 'mumbai', 'san-francisco', 'new-york'];
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
].find(existsSync);

/** Totals across every city, for the home image's line of faces. */
const cafes = CITIES.flatMap((c) => JSON.parse(readFileSync(new URL(`../src/data/${c}.json`, import.meta.url), 'utf8')).cafes);
const investors = new Set(cafes.flatMap((c) => c.vcs.map((v) => (v.handle ?? v.name).toLowerCase()))).size;
const cityNames = ['Bengaluru', 'Mumbai', 'San Francisco', 'New York'];

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });

async function shoot(city, file, home = false) {
  await page.goto('about:blank');
  await page.goto(new URL(`/${city}/`, base).href, { waitUntil: 'load' });
  await page.waitForSelector('.maplibregl-marker');
  // A still image can't be scrolled or zoomed, so those hints go; the map credit stays.
  await page.addStyleTag({
    content: `#hero footer, #hero-body a[href$="/list/"], .maplibregl-ctrl-group { display: none !important; }`,
  });
  if (home) {
    await page.evaluate(
      ({ investors, cafes, cityNames }) => {
        document.querySelector('#hero-title').textContent = 'Where do VCs actually get coffee?';
        document.querySelector('#hero-body p').innerHTML =
          `<b class="font-semibold text-ink">${investors} investors</b> spotted at ${cafes} cafés`;
        // The faces are the first city's; the count on the last one covers every city.
        const faces = document.querySelector('#hero-body p').previousElementSibling;
        const more = faces?.lastElementChild;
        if (more?.textContent.startsWith('+')) more.textContent = `+${investors - (faces.children.length - 1)}`;
        // The buttons become the four cities, set like the cover's own line of text.
        const row = document.querySelector('#hero-body [data-explore]').parentElement;
        const dot = '<span style="width:5px;height:5px;border-radius:50%;background:var(--color-ink-3)"></span>';
        row.innerHTML = cityNames.map((name) => `<span class="text-[19px] font-medium text-ink-2">${name}</span>`).join(dot);
        row.style.gap = '14px';
      },
      { investors, cafes: cafes.length, cityNames },
    );
  }
  await page.evaluate(() => document.fonts.ready);
  // Let the tiles finish and the pins settle.
  await page.waitForTimeout(3500);
  await page.screenshot({ path: out(file), type: 'jpeg', quality: 88 });
  console.log(`saved public/${file}`);
}

mkdirSync(out('og'), { recursive: true });
for (const city of CITIES) await shoot(city, `og/${city}.jpg`);
await shoot(CITIES[0], 'og.jpg', true);
await browser.close();
