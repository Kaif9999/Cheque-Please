/**
 * Renders the link-preview image: the Bengaluru cover at 1200×630 (2× for sharp text), saved to public/og.jpg.
 * Run against a server with the current build, then rebuild so dist/ picks it up:
 *
 *   npm run build && npm run preview & node tools/og.mjs --url http://127.0.0.1:4190/
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const i = process.argv.indexOf('--url');
const base = (i > -1 ? process.argv[i + 1] : 'http://127.0.0.1:4190/').replace(/#.*$/, '');
const out = fileURLToPath(new URL('../public/og.jpg', import.meta.url));
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
].find(existsSync);

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto(`${base}#/bengaluru`, { waitUntil: 'load' });
await page.waitForSelector('.maplibregl-marker');
// A still image can't be scrolled or zoomed, so those hints go; the map credit stays.
await page.addStyleTag({
  content: `#hero footer, #hero-body a[href$="/list"], .maplibregl-ctrl-group { display: none !important; }`,
});
await page.evaluate(() => document.fonts.ready);
// Let the tiles finish and the pins settle.
await page.waitForTimeout(3500);
await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
await browser.close();
console.log(`saved ${out}`);
