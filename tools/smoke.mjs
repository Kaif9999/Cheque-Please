/**
 * Drives the main flows in a real browser and fails loudly if one breaks.
 *
 *   node tools/smoke.mjs --url http://127.0.0.1:4190/
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';

const i = process.argv.indexOf('--url');
const base = (i > -1 ? process.argv[i + 1] : 'http://127.0.0.1:4190/').replace(/#.*$/, '');
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(existsSync);
/** On GitHub Actions, failures also become annotations, which show on the run without opening the logs. */
const annotate = (msg) => process.env.GITHUB_ACTIONS && console.log(`::error title=smoke::${msg.replace(/\s+/g, ' ')}`);
console.log(`chrome: ${CHROME ?? 'none found'}`);

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}: ${e.message.split('\n')[0]}`);
    annotate(`${name}: ${e.message.split('\n')[0]}`);
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
/** Counts the checks expect, read from the same data the site is built from. */
const cafesOf = (city) => JSON.parse(readFileSync(new URL(`../src/data/${city}.json`, import.meta.url), 'utf8')).cafes;
const BENGALURU_CAFES = cafesOf('bengaluru').length;
const MUMBAI_CAFES = cafesOf('mumbai').length;
const BENGALURU_HANDLES = new Set(
  cafesOf('bengaluru')
    .flatMap((c) => c.vcs.map((v) => v.handle?.toLowerCase()))
    .filter(Boolean),
).size;
const rows = () => page.locator('#sheet-body a[data-slug]');
const mode = () => page.evaluate(() => document.body.dataset.mode);
const sheet = () => page.evaluate(() => document.body.dataset.sheet);
async function fresh(path) {
  await page.goto('about:blank');
  await page.goto(new URL(path, base).href, { waitUntil: 'load' });
  await page.waitForSelector('.maplibregl-marker', { timeout: 15000 });
  await page.waitForTimeout(1200);
}

try {
  await fresh('/bengaluru/');
} catch (e) {
  annotate(`the map never showed its pins: ${e.message.split('\n')[0]} | ${errors.join(' | ')}`);
  throw e;
}

await check('opens on the cover for the city', async () => {
  expect((await page.locator('#hero-title').innerText()).includes('Bengaluru'), 'headline missing');
  expect((await mode()) === 'intro', `mode ${await mode()}`);
});

/** Labels of the pins and clusters inside the viewport. */
const onScreen = (target = page) =>
  target.evaluate(() =>
    [...document.querySelectorAll('.maplibregl-marker[aria-label]')]
      .filter((m) => {
        const r = m.getBoundingClientRect();
        return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
      })
      .map((m) => m.getAttribute('aria-label'))
      .join(' | '),
  );
const MUMBAI = /Bandra|Lower Parel|Kala Ghoda|Khar|Chowpatty|Pantry/;

await check('switching city on the cover moves the map too', async () => {
  await page.locator('.seg-opt[data-city="mumbai"]').click();
  await page.waitForTimeout(1800);
  expect(MUMBAI.test(await onScreen()), `no Mumbai pins on screen: ${await onScreen()}`);
  await page.locator('.seg-opt[data-city="bengaluru"]').click();
  await page.waitForTimeout(1800);
  expect(!MUMBAI.test(await onScreen()), 'still on Mumbai');
});

await check('San Francisco and New York show their own cafés', async () => {
  const cities = {
    'san-francisco': /South Park|Palo Alto|Woodside|Sand Hill|Menlo Park|Blue Bottle|Coupa|Rosewood/,
    'new-york': /SoHo|Flatiron|NoMad|Tribeca|Crosby|Balthazar|Odeon/,
  };
  for (const [id, pins] of Object.entries(cities)) {
    await page.locator(`.seg-opt[data-city="${id}"]`).click();
    await page.waitForTimeout(1800);
    expect(pins.test(await onScreen()), `no ${id} pins on screen: ${await onScreen()}`);
  }
  await page.locator('.seg-opt[data-city="bengaluru"]').click();
  await page.waitForTimeout(1800);
});

await check('a short screen still moves the map when the city changes', async () => {
  // The cover is taller than this map, which once stopped the camera from moving at all.
  const short = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await short.goto(new URL('/bengaluru/', base).href, { waitUntil: 'load' });
  await short.waitForSelector('.maplibregl-marker', { timeout: 15000 });
  await short.waitForTimeout(1200);
  await short.locator('#city-select').selectOption('mumbai');
  await short.waitForTimeout(1800);
  const seen = await onScreen(short);
  await short.close();
  expect(MUMBAI.test(seen), `no Mumbai pins on screen: ${seen}`);
});

await check('explore clears the cover and shows the legend', async () => {
  await page.locator('[data-explore]').click();
  await page.waitForTimeout(600);
  expect((await mode()) === 'map', `mode ${await mode()}`);
  expect(await page.locator('#legend [data-filter="first"]').isVisible(), 'legend hidden');
});

await check('a cluster zooms in to separate pins', async () => {
  // Counts only the cluster's own cafés: zooming in can push other pins off the screen.
  const cluster = page.locator('.maplibregl-marker[data-slugs]').first();
  const slugs = (await cluster.getAttribute('data-slugs')).split(' ');
  await cluster.click();
  await page.waitForTimeout(1500);
  const markers = await page.evaluate(
    (slugs) =>
      [...document.querySelectorAll('.maplibregl-marker[data-slug], .maplibregl-marker[data-slugs]')].filter((m) =>
        (m.dataset.slug ?? m.dataset.slugs).split(' ').some((s) => slugs.includes(s)),
      ).length,
    slugs,
  );
  expect(markers > 1, `${slugs.join(', ')} still in ${markers} marker`);
});

await check('a pin opens its café in the side panel', async () => {
  const pin = page.locator('.maplibregl-marker[data-slug]').first();
  const slug = await pin.getAttribute('data-slug');
  await pin.click();
  await page.waitForTimeout(700);
  expect(page.url().endsWith(`/${slug}/`), page.url());
  expect((await sheet()) === 'open', 'panel closed');
  expect((await page.locator('.maplibregl-marker.is-selected').count()) >= 1, 'pin not selected');
});

await check('escape closes the panel', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  expect((await sheet()) === 'closed', 'panel still open');
  expect(page.url().endsWith('/bengaluru/'), page.url());
});

await check('all cafés opens the list in the panel', async () => {
  await page.locator('#top-actions [data-open-list]').click();
  await page.waitForTimeout(700);
  expect((await rows().count()) === BENGALURU_CAFES, `rows: ${await rows().count()}`);
  expect(page.url().endsWith('/bengaluru/list/'), page.url());
});

await check('hovering a row lights up its pin or cluster', async () => {
  await rows().first().hover();
  await page.waitForTimeout(200);
  expect((await page.locator('.maplibregl-marker.is-hover').count()) === 1, 'no highlighted marker');
});

await check('a row opens the café and the back link returns to the list', async () => {
  const name = (await rows().nth(1).locator('span span').first().innerText()).trim();
  await rows().nth(1).click();
  await page.waitForTimeout(600);
  const title = (await page.locator('#sheet-body h1').innerText()).trim();
  expect(title === name, `heading "${title}" ≠ "${name}"`);
  await page.locator('#sheet-body a', { hasText: 'All Bengaluru cafés' }).click();
  await page.waitForTimeout(500);
  expect((await rows().count()) === BENGALURU_CAFES, 'list not shown');
});

await check('the legend filters the list', async () => {
  const chip = page.locator('#legend [data-filter="first"]');
  const count = Number(await chip.locator('span').last().innerText());
  await chip.click();
  await page.waitForTimeout(500);
  expect((await rows().count()) === count, `rows ${await rows().count()} ≠ ${count}`);
  await page.locator('#legend [data-filter=""]').click();
  await page.waitForTimeout(300);
});

await check('follow all lists everyone with an X handle', async () => {
  await page.locator('#top-actions [data-follow-all]').click();
  await page.waitForSelector('#follow[open]');
  expect((await page.locator('#follow li').count()) === BENGALURU_HANDLES, `rows ${await page.locator('#follow li').count()}`);
  await page.locator('#follow [data-close]').click();
});

await check('the city switch swaps the list', async () => {
  await page.locator('.seg-opt[data-city="mumbai"]').click();
  await page.waitForTimeout(800);
  await page.locator('#top-actions [data-open-list]').click();
  await page.waitForTimeout(600);
  expect((await page.locator('#sheet-body h2').first().innerText()).includes('Mumbai'), 'panel title did not change');
  expect((await rows().count()) === MUMBAI_CAFES, 'Mumbai rows missing');
});

await check('the wordmark goes back to the cover', async () => {
  await page.locator('#home').click();
  await page.waitForTimeout(600);
  expect((await mode()) === 'intro', `mode ${await mode()}`);
  expect((await sheet()) === 'closed', 'panel still open');
  expect((await page.locator('#hero-title').innerText()).includes('Mumbai'), 'cover not for Mumbai');
});

await check('scrolling over the cover dives into the map', async () => {
  await page.mouse.move(300, 450);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(600);
  expect((await mode()) === 'map', `mode ${await mode()}`);
});

await check('after a café and the wordmark, switching city still moves the map', async () => {
  // Focusing a café once left padding on the map that made every later fit impossible.
  await fresh('/bengaluru/araku-indiranagar/');
  await page.locator('#home').click();
  await page.waitForTimeout(1500);
  await page.locator('.seg-opt[data-city="mumbai"]').click();
  await page.waitForTimeout(2000);
  expect(MUMBAI.test(await onScreen()), `no Mumbai pins on screen: ${await onScreen()}`);
});

await check('a neighbourhood page lists only its cafés', async () => {
  await fresh('/bengaluru/area/indiranagar/');
  const expected = cafesOf('bengaluru').filter((c) => c.area === 'Indiranagar').length;
  expect((await sheet()) === 'open', 'panel closed');
  expect((await page.locator('#sheet-body h1').innerText()).trim() === 'Indiranagar', 'heading is not the neighbourhood');
  expect((await rows().count()) === expected, `rows ${await rows().count()} ≠ ${expected}`);
});

await check('a link shared before paths opens at its path', async () => {
  await fresh('/#/mumbai/subko-bandra');
  expect(new URL(page.url()).pathname === '/mumbai/subko-bandra/', page.url());
  expect((await page.locator('#sheet-body h1').innerText()).trim() === 'Subko', 'café not open');
});

await check('back and forward follow the panel', async () => {
  await fresh('/bengaluru/list/');
  await rows().first().click();
  await page.waitForTimeout(500);
  await page.goBack();
  await page.waitForTimeout(500);
  expect(page.url().endsWith('/bengaluru/list/'), page.url());
  expect((await rows().count()) === BENGALURU_CAFES, 'list not back');
});

await check('no page errors', async () => expect(errors.length === 0, errors.join(' | ')));

await browser.close();
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
